// What we persist for each completed run. Kept serializable so any backend
// (Postgres, Blob, KV…) can store it.

import type { SelectedOrder } from "@/lib/shopify/types";

export interface RunFeedback {
  /** 1–5 (how well the questionnaire worked). */
  rating: number;
  comment?: string;
}

/** Customer contact details — from Shopify (order path) or collected (no-order). */
export interface Contact {
  name: string;
  email: string;
  phone?: string;
}

/** Slug-level answer used by the AI transcript (diagnose path). */
export interface RunAnswer {
  questionId: string;
  prompt: string;
  value: string | string[];
}

/** Human-readable answer stored on the run (option labels, not slugs). */
export interface StoredAnswer {
  prompt: string;
  value: string | string[];
}

/** Full diagnosis stored on the run (so the knowledge base has the detail). */
export interface StoredDiagnosis {
  title: string;
  summary: string;
  steps: string[];
  partsTools?: string[];
  escalation?: string;
}

export interface RunRecord {
  id: string;
  createdAt: string; // ISO timestamp
  category: string; // e.g. "range_hood"
  branchKey?: string;
  pathValue?: string;
  /** Matched/selected model (e.g. "PLJW 104") — for grouping issues by SKU. */
  model?: string;
  order?: SelectedOrder; // selected Shopify order + product, if looked up
  contact?: Contact; // customer contact for the support ticket
  answers: StoredAnswer[];
  diagnoses: StoredDiagnosis[];
  feedback?: RunFeedback;
  /** Internal CS-agent notes captured at the diagnosis step. */
  agentNotes?: string;
  /** Vercel Blob URL of the rendered PDF, once stored. */
  pdfUrl?: string;
}

/** The one seam every persistence backend implements. */
export interface StorageAdapter {
  saveRun(record: RunRecord): Promise<void>;
  listRuns(): Promise<RunRecord[]>;
}
