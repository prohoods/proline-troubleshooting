"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { apiUrl } from "@/lib/apiBase";

/**
 * Usage numbers for the guide, in a browser rather than a curl command.
 *
 * Counts completed runs — every one of which created a support case — so this
 * is the ticket load the guide is generating. The token is held in
 * localStorage so it's typed once, and never appears in the URL where it would
 * end up in browser history and server logs.
 */
interface Stats {
  days: number;
  total: number;
  byDay: { day: string; runs: number }[];
  byCategory: { category: string; runs: number }[];
  byBranch: { category: string; branch: string | null; runs: number }[];
}

const STORAGE_KEY = "proline-admin-token";
const LABELS: Record<string, string> = {
  range_hood: "Range Hoods",
  ranges: "Ranges & Cooktops",
};
const pretty = (s: string | null) =>
  !s ? "—" : (LABELS[s] ?? s.replace(/^r_/, "").replace(/_/g, " "));

export default function StatsPage() {
  // The token lives in an uncontrolled input rather than state: the saved value
  // is written straight to the DOM on mount, which avoids setting state inside
  // an effect (and the cascading render that comes with it).
  const tokenRef = useRef<HTMLInputElement>(null);
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && tokenRef.current) tokenRef.current.value = saved;
  }, []);

  const load = useCallback(
    async (t: string, d: number) => {
      if (!t.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(`/api/admin/stats?days=${d}`), {
          headers: { "x-admin-token": t.trim() },
        });
        if (res.status === 401) {
          setError("That password isn't right.");
          setStats(null);
          return;
        }
        if (!res.ok) {
          setError("Couldn't load the numbers. Try again in a moment.");
          setStats(null);
          return;
        }
        setStats((await res.json()) as Stats);
        window.localStorage.setItem(STORAGE_KEY, t.trim());
      } catch {
        setError("Couldn't reach the server.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );



  const busiest = stats?.byDay.reduce((a, b) => (b.runs > a.runs ? b : a), {
    day: "",
    runs: 0,
  });

  return (
    <AppShell>
      <section>
        <h1 className="text-3xl font-bold text-ink">Troubleshooting guide — usage</h1>
        <p className="mt-3 max-w-xl text-muted">
          Every completed run creates a support case, so these are the tickets
          the guide is generating.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Password</span>
            <input
              ref={tokenRef}
              type="password"
              defaultValue=""
              onKeyDown={(e) =>
                e.key === "Enter" && void load(tokenRef.current?.value ?? "", days)
              }
              placeholder="ADMIN_TOKEN"
              className="w-72 rounded-xl border border-field bg-white px-4 py-3 text-ink focus:border-sky focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Period</span>
            <select
              value={days}
              onChange={(e) => {
                const next = Number(e.target.value);
                setDays(next);
                void load(tokenRef.current?.value ?? "", next);
              }}
              className="rounded-xl border border-field bg-white px-4 py-3 text-ink focus:border-sky focus:outline-none"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </label>
          <Button
            onClick={() => void load(tokenRef.current?.value ?? "", days)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Show numbers"}
          </Button>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {stats && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Tile label={`Tickets, last ${stats.days} days`} value={stats.total} />
              <Tile
                label="Average per day"
                value={(stats.total / stats.days).toFixed(1)}
              />
              <Tile
                label="Busiest day"
                value={busiest?.runs ? `${busiest.runs}` : "—"}
                sub={busiest?.runs ? busiest.day : undefined}
              />
            </div>

            {stats.total === 0 && (
              <p className="mt-6 rounded-2xl border border-line bg-mist p-5 text-sm text-muted">
                Nothing yet in this period. That&apos;s expected until the guide
                is linked from somewhere customers actually go.
              </p>
            )}

            <Table
              title="By product"
              rows={stats.byCategory.map((c) => [pretty(c.category), c.runs])}
            />
            <Table
              title="By issue"
              rows={stats.byBranch.map((b) => [
                `${pretty(b.category)} — ${pretty(b.branch)}`,
                b.runs,
              ])}
            />
            <Table
              title="By day"
              rows={stats.byDay.map((d) => [d.day, d.runs])}
            />
          </>
        )}
      </section>
    </AppShell>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: [string, number][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        {rows.map(([label, n], i) => (
          <div
            key={`${label}-${i}`}
            className={`flex items-center justify-between px-4 py-3 text-sm ${
              i % 2 ? "bg-mist/50" : "bg-white"
            }`}
          >
            <span className="text-ink">{label}</span>
            <span className="font-bold text-ink">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
