import { NextResponse } from "next/server";
import { postgresConfigured, pruneRuns } from "@/lib/storage/postgres";

/**
 * Scheduled retention pass (see vercel.json).
 *
 * Stopgap is the system of record for a support case. This table exists to show
 * which products and branches customers land on, and that analysis needs no
 * personal data — so contact and order details are cleared first, and the row
 * itself goes later.
 *
 * Defaults: strip personal data at 90 days, delete the row at 730. Override
 * with RUN_PII_RETENTION_DAYS / RUN_RETENTION_DAYS.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export async function GET(request: Request) {
  // Vercel Cron sends this header; CRON_SECRET keeps the endpoint from being
  // triggered by anyone who finds the URL.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  if (!postgresConfigured()) {
    return NextResponse.json({ ok: true, skipped: "no database configured" });
  }

  const piiDays = num(process.env.RUN_PII_RETENTION_DAYS, 90);
  const deleteDays = num(process.env.RUN_RETENTION_DAYS, 730);

  try {
    const result = await pruneRuns({ piiDays, deleteDays });
    console.log(
      `[prune-runs] anonymised=${result.anonymised} deleted=${result.deleted} (pii>${piiDays}d, rows>${deleteDays}d)`,
    );
    return NextResponse.json({ ok: true, piiDays, deleteDays, ...result });
  } catch (e) {
    console.error("[prune-runs] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "prune failed" }, { status: 500 });
  }
}
