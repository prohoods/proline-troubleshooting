import { neon } from "@neondatabase/serverless";
import type {
  RunRecord,
  StorageAdapter,
  StoredAnswer,
  StoredDiagnosis,
} from "./types";

// Neon (via the Vercel integration) exposes the pooled connection as DATABASE_URL.
const CONNECTION = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export const postgresConfigured = (): boolean => Boolean(CONNECTION);

// Lazily create the client so importing this module never requires the env var —
// the in-memory fallback must keep working without a database.
let client: ReturnType<typeof neon> | null = null;
function db(): ReturnType<typeof neon> {
  if (!client) {
    if (!CONNECTION) throw new Error("DATABASE_URL is not set");
    client = neon(CONNECTION);
  }
  return client;
}

let ensured: Promise<unknown> | null = null;
function ensureTable(): Promise<unknown> {
  if (!ensured) {
    ensured = db()`
      CREATE TABLE IF NOT EXISTS runs (
        id           text PRIMARY KEY,
        created_at   timestamptz NOT NULL,
        category     text NOT NULL,
        branch_key   text,
        path_value   text,
        model        text,
        order_json   jsonb,
        contact_json jsonb,
        answers      jsonb NOT NULL DEFAULT '[]'::jsonb,
        diagnoses    jsonb NOT NULL DEFAULT '[]'::jsonb,
        rating       int,
        comment      text,
        agent_notes  text,
        pdf_url      text
      )
    `;
  }
  return ensured;
}

interface Row {
  id: string;
  created_at: string | Date;
  category: string;
  branch_key: string | null;
  path_value: string | null;
  model: string | null;
  order_json: RunRecord["order"] | null;
  contact_json: RunRecord["contact"] | null;
  answers: StoredAnswer[] | null;
  diagnoses: StoredDiagnosis[] | null;
  rating: number | null;
  comment: string | null;
  agent_notes: string | null;
  pdf_url: string | null;
}

const toRecord = (r: Row): RunRecord => ({
  id: r.id,
  createdAt: new Date(r.created_at).toISOString(),
  category: r.category,
  branchKey: r.branch_key ?? undefined,
  pathValue: r.path_value ?? undefined,
  model: r.model ?? undefined,
  order: r.order_json ?? undefined,
  contact: r.contact_json ?? undefined,
  answers: r.answers ?? [],
  diagnoses: r.diagnoses ?? [],
  feedback:
    r.rating != null
      ? { rating: r.rating, comment: r.comment ?? undefined }
      : undefined,
  agentNotes: r.agent_notes ?? undefined,
  pdfUrl: r.pdf_url ?? undefined,
});

export const postgresStorage: StorageAdapter = {
  async saveRun(r: RunRecord): Promise<void> {
    await ensureTable();
    await db()`
      INSERT INTO runs (
        id, created_at, category, branch_key, path_value, model,
        order_json, contact_json, answers, diagnoses,
        rating, comment, agent_notes, pdf_url
      ) VALUES (
        ${r.id}, ${r.createdAt}, ${r.category}, ${r.branchKey ?? null},
        ${r.pathValue ?? null}, ${r.model ?? null},
        ${JSON.stringify(r.order ?? null)}::jsonb,
        ${JSON.stringify(r.contact ?? null)}::jsonb,
        ${JSON.stringify(r.answers)}::jsonb,
        ${JSON.stringify(r.diagnoses)}::jsonb,
        ${r.feedback?.rating ?? null}, ${r.feedback?.comment ?? null},
        ${r.agentNotes ?? null}, ${r.pdfUrl ?? null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  },

  async listRuns(): Promise<RunRecord[]> {
    await ensureTable();
    const rows = (await db()`
      SELECT * FROM runs ORDER BY created_at DESC LIMIT 500
    `) as unknown as Row[];
    return rows.map(toRecord);
  },
};

/**
 * Retention, in two stages, because contact details and analytics have very
 * different useful lifespans.
 *
 * Stopgap is the system of record for a support case — this table exists so we
 * can see which products and branches customers actually land on. That analysis
 * needs no names, emails, phone numbers, or order details, so those are cleared
 * well before the row itself goes.
 *
 * Returns what it changed so a scheduled run can be verified rather than
 * assumed.
 */
export async function pruneRuns(opts: {
  piiDays: number;
  deleteDays: number;
}): Promise<{ anonymised: number; deleted: number }> {
  if (!postgresConfigured()) return { anonymised: 0, deleted: 0 };
  await ensureTable();

  // Stage 1 — strip the personal data, keep the shape of the run.
  const anonymised = (await db()`
    UPDATE runs
       SET contact_json = NULL,
           order_json   = NULL
     WHERE created_at < now() - (${opts.piiDays} || ' days')::interval
       AND (contact_json IS NOT NULL OR order_json IS NOT NULL)
    RETURNING id
  `) as { id: string }[];

  // Stage 2 — drop the row entirely once even the aggregate has aged out.
  const deleted = (await db()`
    DELETE FROM runs
     WHERE created_at < now() - (${opts.deleteDays} || ' days')::interval
    RETURNING id
  `) as { id: string }[];

  return { anonymised: anonymised.length, deleted: deleted.length };
}

/** Aggregate counts for volume monitoring. No personal data leaves here. */
export async function runStats(days: number): Promise<{
  total: number;
  byDay: { day: string; runs: number }[];
  byCategory: { category: string; runs: number }[];
  byBranch: { category: string; branch: string | null; runs: number }[];
}> {
  if (!postgresConfigured())
    return { total: 0, byDay: [], byCategory: [], byBranch: [] };
  await ensureTable();
  const since = `${days} days`;

  const [total, byDay, byCategory, byBranch] = await Promise.all([
    db()`SELECT count(*)::int AS n FROM runs WHERE created_at > now() - (${since})::interval`,
    db()`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS runs
           FROM runs WHERE created_at > now() - (${since})::interval
          GROUP BY 1 ORDER BY 1 DESC`,
    db()`SELECT category, count(*)::int AS runs
           FROM runs WHERE created_at > now() - (${since})::interval
          GROUP BY 1 ORDER BY 2 DESC`,
    db()`SELECT category, branch_key AS branch, count(*)::int AS runs
           FROM runs WHERE created_at > now() - (${since})::interval
          GROUP BY 1, 2 ORDER BY 3 DESC`,
  ]);

  return {
    total: (total as { n: number }[])[0]?.n ?? 0,
    byDay: byDay as { day: string; runs: number }[],
    byCategory: byCategory as { category: string; runs: number }[],
    byBranch: byBranch as { category: string; branch: string | null; runs: number }[],
  };
}
