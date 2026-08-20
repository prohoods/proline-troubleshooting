import { NextResponse } from "next/server";
import { pruneBlobs } from "@/lib/storage/blob";
import { postgresConfigured, pruneRuns } from "@/lib/storage/postgres";

/**
 * Scheduled retention pass (see vercel.json).
 *
 * Stopgap is the system of record for a support case. This table exists to show
 * which products and branches customers land on, and that analysis needs no
 * personal data — so contact and order details are cleared first, and the row
 * itself goes later.
 *
 * Customer videos are pruned here too. They live in blob storage rather than
 * the database, but they're personal data on the same footing as the rest, and
 * nothing references them once the case is closed.
 *
 * Defaults: strip personal data at 90 days, delete the row at 730, delete
 * videos at 90. Override with RUN_PII_RETENTION_DAYS / RUN_RETENTION_DAYS /
 * VIDEO_RETENTION_DAYS.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export async function GET(request: Request) {
  // This endpoint deletes data, so it fails CLOSED: no CRON_SECRET means it
  // refuses to run rather than allowing an anonymous prune. Vercel Cron sends
  // the secret as a bearer token automatically.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured; refusing to prune" },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const piiDays = num(process.env.RUN_PII_RETENTION_DAYS, 90);
  const deleteDays = num(process.env.RUN_RETENTION_DAYS, 730);
  const videoDays = num(process.env.VIDEO_RETENTION_DAYS, 90);

  // Stored files are pruned even with no database configured — they live
  // outside it, and skipping them would leave them there forever. Videos go on
  // their own shorter clock; PDFs go when the row they describe does.
  let videosDeleted = 0;
  let pdfsDeleted = 0;
  try {
    videosDeleted = await pruneBlobs("support-video/", videoDays);
    pdfsDeleted = await pruneBlobs("runs/", deleteDays);
  } catch (e) {
    console.error("[prune-runs] file prune failed:", e instanceof Error ? e.message : e);
  }

  if (!postgresConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: "no database configured",
      videoDays,
      videosDeleted,
      pdfsDeleted,
    });
  }

  try {
    const result = await pruneRuns({ piiDays, deleteDays });
    console.log(
      `[prune-runs] anonymised=${result.anonymised} deleted=${result.deleted} videos=${videosDeleted} pdfs=${pdfsDeleted} (pii>${piiDays}d, rows>${deleteDays}d, videos>${videoDays}d)`,
    );
    return NextResponse.json({
      ok: true,
      piiDays,
      deleteDays,
      videoDays,
      videosDeleted,
      pdfsDeleted,
      ...result,
    });
  } catch (e) {
    console.error("[prune-runs] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "prune failed" }, { status: 500 });
  }
}
