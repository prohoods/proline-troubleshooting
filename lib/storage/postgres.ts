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
