// Some Vercel/Neon integrations expose the connection as DATABASE_URL rather
// than POSTGRES_URL (which @vercel/postgres reads). Normalize before importing.
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

import { sql } from "@vercel/postgres";
import type { RunRecord, StorageAdapter, StoredAnswer, StoredDiagnosis } from "./types";

export const postgresConfigured = (): boolean =>
  Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);

let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = sql`
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
    `.then(() => undefined);
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
    r.rating != null ? { rating: r.rating, comment: r.comment ?? undefined } : undefined,
  agentNotes: r.agent_notes ?? undefined,
  pdfUrl: r.pdf_url ?? undefined,
});

export const postgresStorage: StorageAdapter = {
  async saveRun(r: RunRecord): Promise<void> {
    await ensureTable();
    await sql`
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
    const { rows } = await sql<Row>`
      SELECT * FROM runs ORDER BY created_at DESC LIMIT 500
    `;
    return rows.map(toRecord);
  },
};
