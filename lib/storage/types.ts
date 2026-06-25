// What we persist for each completed run. Kept deliberately small and
// serializable so any backend (Postgres, KV, Supabase…) can store it.

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

export interface RunAnswer {
  questionId: string;
  prompt: string;
  value: string | string[];
}

export interface RunDiagnosis {
  id: string;
  title: string;
}

export interface RunRecord {
  id: string;
  createdAt: string; // ISO timestamp
  category: string; // e.g. "range_hood"
  branchKey?: string;
  pathValue?: string;
  order?: SelectedOrder; // selected Shopify order + product, if looked up
  contact?: Contact; // customer contact for the support ticket
  answers: RunAnswer[];
  diagnoses: RunDiagnosis[];
  feedback?: RunFeedback;
  /** Internal CS-agent notes captured at the diagnosis step. */
  agentNotes?: string;
}

/** The one seam every persistence backend implements. */
export interface StorageAdapter {
  saveRun(record: RunRecord): Promise<void>;
  listRuns(): Promise<RunRecord[]>;
}
