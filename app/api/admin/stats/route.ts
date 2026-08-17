import { NextResponse } from "next/server";
import { postgresConfigured, runStats } from "@/lib/storage/postgres";

/**
 * Volume monitoring for the guide.
 *
 * Every completed run now creates a support case, so this is the early warning
 * for ticket load — especially in the days after the guide gets linked from a
 * high-traffic page. Aggregates only: no names, emails, or answers.
 *
 *   GET /api/admin/stats?days=30   with header  x-admin-token: <ADMIN_TOKEN>
 *
 * Stopgap remains the system of record for cases; this counts what the guide
 * itself sent, which is the number that moves when an entry point goes live.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  const days = Math.min(
    Math.max(Number(new URL(request.url).searchParams.get("days") ?? 30) || 30, 1),
    365,
  );

  try {
    return NextResponse.json({ ok: true, days, ...(await runStats(days)) });
  } catch (e) {
    console.error("[stats] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }
}
