"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import type { DiagnosisResult } from "@/lib/diagnoses/resolve";
import { LIKELIHOOD_LABEL, type Diagnosis } from "@/lib/diagnoses/types";
import { NO_ORDER_VALUE } from "@/lib/flow/constants";
import type { AnswerRecord } from "@/lib/flow/engine";
import type { SpecMatch } from "@/lib/knowledge/specSheets";
import type { SelectedOrder } from "@/lib/shopify/types";
import type { RunFeedback } from "@/lib/storage/types";
import { FeedbackForm } from "./FeedbackForm";

const CHIP: Record<Diagnosis["likelihood"], string> = {
  most_likely: "bg-sky text-white",
  possible: "bg-sky-soft text-ink",
  less_likely: "bg-mist text-muted",
};

function DiagnosisCard({ d }: { d: Diagnosis }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${CHIP[d.likelihood]}`}
        >
          {LIKELIHOOD_LABEL[d.likelihood]}
        </span>
        {d.placeholder && (
          <span className="rounded-full bg-accent/40 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wide text-ink/70">
            Placeholder content
          </span>
        )}
      </div>

      <h3 className="mt-3 text-xl font-bold text-ink">{d.title}</h3>
      <p className="mt-2 text-muted">{d.summary}</p>

      <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-ink">
        Suggested fix
      </h4>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-ink/90">
        {d.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      {d.partsTools && d.partsTools.length > 0 && (
        <>
          <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-ink">
            Parts &amp; tools
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/90">
            {d.partsTools.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </>
      )}

      {d.escalation && (
        <div className="mt-5 flex gap-2 rounded-xl bg-mist p-4 text-sm text-muted">
          <Icon name="alert" className="h-5 w-5 shrink-0 text-sky" />
          <span>{d.escalation}</span>
        </div>
      )}
    </article>
  );
}

/** Plain-text run summary an agent can paste straight into a ticket. */
function buildSummary(
  order: SelectedOrder | null,
  answers: AnswerRecord[],
  diagnoses: Diagnosis[],
  spec: SpecMatch | null,
  notes: string,
): string {
  const L: string[] = ["PROLINE TROUBLESHOOTING SUMMARY", new Date().toLocaleString(), ""];

  if (order) {
    L.push(
      `Product: ${order.product.title}${order.product.sku ? ` (SKU ${order.product.sku})` : ""}`,
    );
    const bits = [order.orderName];
    if (order.processedAt)
      bits.push(`purchased ${new Date(order.processedAt).toLocaleDateString()}`);
    if (order.fulfillmentStatus) bits.push(order.fulfillmentStatus);
    L.push(`Order: ${bits.join(" · ")}`);
  } else if (spec) {
    L.push(`Product: ${spec.model} (entered manually)`);
  }
  if (spec?.pdfUrl) L.push(`Spec sheet: ${spec.pdfUrl}`);

  L.push("", "ANSWERS");
  for (const a of answers) {
    if (a.questionId === "p_order_lookup" || a.value === NO_ORDER_VALUE) continue;
    const v = Array.isArray(a.value) ? a.value.join(", ") : a.value;
    L.push(`- ${a.prompt} -> ${v}`);
  }

  L.push("", "LIKELY DIAGNOSIS");
  diagnoses.forEach((d, i) => {
    L.push(`${i + 1}. [${LIKELIHOOD_LABEL[d.likelihood]}] ${d.title}`);
    L.push(`   ${d.summary}`);
    if (d.steps.length) L.push(`   Fix: ${d.steps.join(" | ")}`);
    if (d.escalation) L.push(`   Escalate: ${d.escalation}`);
  });

  if (notes.trim()) L.push("", "AGENT NOTES", notes.trim());

  return L.join("\n");
}

export function DiagnosisScreen({
  result,
  order,
  answers,
  spec,
  onSubmitFeedback,
  onRestart,
}: {
  result: DiagnosisResult;
  order: SelectedOrder | null;
  answers: AnswerRecord[];
  spec: SpecMatch | null;
  onSubmitFeedback: (
    feedback: RunFeedback,
    agentNotes?: string,
  ) => Promise<{ ok: boolean }>;
  onRestart: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const copySummary = async () => {
    const text = buildSummary(order, answers, result.diagnoses, spec, notes);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked (e.g. non-secure context) — no-op.
    }
  };

  const productLabel = order
    ? order.product.title
    : spec
      ? spec.model
      : "Product not identified";
  const productSub = order
    ? [
        order.orderName,
        order.processedAt && new Date(order.processedAt).toLocaleDateString(),
      ]
        .filter(Boolean)
        .join(" · ")
    : spec
      ? "Entered manually"
      : "";

  return (
    <section className="py-2">
      <Eyebrow>Likely diagnosis</Eyebrow>
      <h2 className="mt-5 text-3xl font-bold text-ink sm:text-4xl">
        Here&apos;s what we think.
      </h2>
      <p className="mt-3 max-w-xl text-muted">
        Based on your answers, these are the most likely causes — each with a
        suggested fix. Work through them top to bottom.
      </p>

      {/* Agent toolbar: product context, spec PDF, copy-to-ticket */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-mist/50 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {productLabel}
          </p>
          {productSub && (
            <p className="truncate text-xs text-muted">{productSub}</p>
          )}
        </div>
        {spec?.pdfUrl && (
          <a
            href={spec.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-sky hover:text-sky-dark"
          >
            Spec sheet (PDF) →
          </a>
        )}
        <button
          type="button"
          onClick={copySummary}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
          {copied ? "Copied" : "Copy summary"}
        </button>
      </div>

      <div className="mt-7 space-y-4">
        {result.diagnoses.map((d) => (
          <DiagnosisCard key={d.id} d={d} />
        ))}
      </div>

      {/* Internal agent notes — included in the copied summary + saved with the run */}
      <div className="mt-8">
        <label
          htmlFor="agent-notes"
          className="text-xs font-bold uppercase tracking-wide text-muted"
        >
          Agent notes (internal)
        </label>
        <textarea
          id="agent-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes for the ticket — what you tried, customer sentiment, next steps…"
          className="mt-2 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-sky"
        />
        <p className="mt-1.5 text-xs text-muted">
          Included in the copied summary and saved with this run.
        </p>
      </div>

      <div className="mt-10 border-t border-line pt-8">
        {submitted ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky text-white">
                <Icon name="check" className="h-4 w-4" strokeWidth={3} />
              </span>
              <h3 className="text-lg font-bold text-ink">
                Thanks for the feedback.
              </h3>
            </div>
            <p className="mt-2 text-sm text-muted">
              It helps us make this guide better.
            </p>
            <button
              type="button"
              onClick={onRestart}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-sky hover:text-sky-dark"
            >
              <Icon name="restart" className="h-4 w-4" /> Troubleshoot another
              issue
            </button>
          </div>
        ) : (
          <>
            <FeedbackForm
              onSubmit={async (fb) => {
                const r = await onSubmitFeedback(fb, notes);
                if (r.ok) setSubmitted(true);
                return r;
              }}
            />
            <button
              type="button"
              onClick={onRestart}
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
            >
              <Icon name="restart" className="h-4 w-4" /> Start over without
              feedback
            </button>
          </>
        )}
      </div>
    </section>
  );
}
