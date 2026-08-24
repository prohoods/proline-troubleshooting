import type { DiagnoseContext } from "./diagnose";
import { findSpec } from "@/lib/knowledge/specSheets";

/**
 * Asks Proline AI — the Brain assistant in the analytics dashboard — to read a
 * finished questionnaire and name the likely causes.
 *
 * Why not keep doing it here: this app carried its own summary of Proline
 * knowledge, hand-written in July and frozen ever since. It could not look
 * anything up, so nothing learned after that date reached an agent. The Brain
 * searches the live vault — every product note, the KB, the support playbooks —
 * and is the same assistant the team chats with, so the ticket says what they'd
 * have got by asking it themselves.
 *
 * Optional and best-effort. Without PROLINE_AI_URL and PROLINE_AI_KEY this
 * reports "not configured" and the caller falls back to the local model. The
 * customer's ticket never depends on any of it.
 */

export interface BrainCause {
  title: string;
  confidence?: string;
  why?: string;
  checks?: string[];
  fix?: string;
}

export interface BrainDiagnosis {
  causes: BrainCause[];
  askFirst?: string[];
  notes?: string;
  /** Vault notes the assistant actually read — shown so an agent can check it. */
  consulted?: string[];
}

export const brainConfigured = (): boolean =>
  Boolean(process.env.PROLINE_AI_URL && process.env.PROLINE_AI_KEY);

/** The questionnaire as plain text, which is what the assistant reads. */
export function transcriptFor(ctx: DiagnoseContext): string {
  const lines = ctx.answers
    .map((a) => {
      const value = Array.isArray(a.value) ? a.value.join(", ") : a.value;
      return value ? `Q: ${a.prompt}\nA: ${value}` : null;
    })
    .filter(Boolean);
  return lines.join("\n\n");
}

export async function diagnoseWithBrain(
  ctx: DiagnoseContext,
  signal?: AbortSignal,
): Promise<BrainDiagnosis | null> {
  const url = process.env.PROLINE_AI_URL;
  const key = process.env.PROLINE_AI_KEY;
  if (!url || !key) return null;

  const product = ctx.order?.product;
  const spec = findSpec([product?.title, product?.sku, ctx.modelText]);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transcript: transcriptFor(ctx),
      model: spec?.model ?? product?.sku ?? ctx.modelText ?? "",
      issue: ctx.branchKey ?? ctx.category,
    }),
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`proline_ai_${res.status}: ${detail}`);
  }

  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    data?: BrainDiagnosis & { error?: string };
  } | null;

  const data = json?.data;
  if (!json?.ok || !data || data.error) {
    throw new Error(`proline_ai_bad_body: ${data?.error ?? "no data"}`);
  }
  if (!Array.isArray(data.causes) || data.causes.length === 0) return null;
  return data;
}

/** The agent-facing block for the ticket. */
export function formatBrainSection(d: BrainDiagnosis): string {
  const L: string[] = [
    "",
    "==============================================",
    "PROLINE AI PRE-DIAGNOSIS — INTERNAL, FOR THE AGENT",
    "(Proline AI read this questionnaire against the Brain",
    "when the case was submitted. The customer never saw it.)",
    "==============================================",
  ];

  d.causes.forEach((c, i) => {
    L.push(`${i + 1}. ${c.title}${c.confidence ? ` [${c.confidence} confidence]` : ""}`);
    if (c.why) L.push(`   Why: ${c.why}`);
    if (c.checks?.length) L.push(`   Check: ${c.checks.join(" | ")}`);
    if (c.fix) L.push(`   Fix: ${c.fix}`);
  });

  if (d.askFirst?.length) {
    L.push("", "ASK THE CUSTOMER FIRST", ...d.askFirst.map((q) => `- ${q}`));
  }
  if (d.notes?.trim()) L.push("", `NOTE: ${d.notes.trim()}`);
  if (d.consulted?.length) {
    L.push("", `Brain notes consulted: ${d.consulted.slice(0, 8).join("; ")}`);
  }
  return L.join("\n");
}
