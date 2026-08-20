import { NextResponse } from "next/server";
import {
  hideRunsBefore,
  listRuns,
  postgresConfigured,
  setRunsHidden,
} from "@/lib/storage/postgres";

/**
 * The list behind the numbers, and the switch that takes a row out of them.
 *
 * The counts on the stats page are only useful once the runs we made ourselves
 * stop being in them. GET returns recent submissions with enough detail to tell
 * a customer from a test; POST flags them.
 *
 *   GET  /api/admin/runs?days=30            x-admin-token: <ADMIN_TOKEN>
 *   POST /api/admin/runs  { ids, hidden }   x-admin-token: <ADMIN_TOKEN>
 *   POST /api/admin/runs  { before, hidden: true }
 *
 * Unlike the stats endpoint this returns names and emails, so it is never
 * exposed to the analytics dashboard — the password stays on this app.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function guard(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_TOKEN is not configured" },
      { status: 503 },
    );
  }
  if (request.headers.get("x-admin-token") !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!postgresConfigured()) {
    return NextResponse.json(
      { ok: false, error: "no database configured" },
      { status: 503 },
    );
  }
  return null;
}

export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const days = Math.min(
    Math.max(Number(new URL(request.url).searchParams.get("days") ?? 30) || 30, 1),
    365,
  );

  try {
    return NextResponse.json({ ok: true, days, runs: await listRuns(days) });
  } catch (e) {
    console.error("[admin/runs] list failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  let body: { ids?: unknown; before?: unknown; hidden?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const hidden = body.hidden !== false;

  try {
    // Cut-off form: everything older than a date, for the pre-launch pile.
    if (typeof body.before === "string" && body.before.trim()) {
      const when = new Date(body.before);
      if (Number.isNaN(when.getTime())) {
        return NextResponse.json({ ok: false, error: "bad date" }, { status: 400 });
      }
      const changed = await hideRunsBefore(when.toISOString());
      return NextResponse.json({ ok: true, changed });
    }

    const ids = Array.isArray(body.ids)
      ? body.ids.filter((v): v is string => typeof v === "string").slice(0, 500)
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "no runs given" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      changed: await setRunsHidden(ids, hidden),
    });
  } catch (e) {
    console.error("[admin/runs] update failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
  }
}
