"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import type { DiagnosisResult } from "@/lib/diagnoses/resolve";
import type { Diagnosis } from "@/lib/diagnoses/types";
import { NO_ORDER_VALUE } from "@/lib/flow/constants";
import type { AnswerRecord } from "@/lib/flow/engine";
import type { SpecMatch } from "@/lib/knowledge/specSheets";
import type { SelectedOrder } from "@/lib/shopify/types";
import type { Contact, RunFeedback } from "@/lib/storage/types";
import { FeedbackForm } from "./FeedbackForm";
import { type CaseDefaults, SupportCaseForm } from "./SupportCaseForm";

function DiagnosisCard({ d }: { d: Diagnosis }) {
  const [open, setOpen] = useState(false);
  const hasFix =
    d.steps.length > 0 || (d.partsTools?.length ?? 0) > 0 || !!d.escalation;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-full bg-sky-soft px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wide text-sky">
          Possible
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">{d.title}</h3>
          <p className="mt-0.5 text-sm text-muted">{d.summary}</p>

          {hasFix && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky hover:text-sky-dark"
            >
              {open ? "Hide fix" : "Show fix"}
              <Icon
                name="chevron"
                className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
              />
            </button>
          )}

          {open && hasFix && (
            <div className="mt-3 border-t border-line pt-3">
              {d.steps.length > 0 && (
                <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/90">
                  {d.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              )}
              {d.partsTools && d.partsTools.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  <span className="font-semibold text-ink">Parts &amp; tools:</span>{" "}
                  {d.partsTools.join(", ")}
                </p>
              )}
              {d.escalation && (
                <p className="mt-2 text-xs text-muted">{d.escalation}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Plain-text run summary an agent can paste straight into a ticket. */
function buildSummary(
  order: SelectedOrder | null,
  contact: Contact | null,
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

  if (contact) {
    L.push("", "CONTACT", `Name: ${contact.name}`, `Email: ${contact.email}`);
    if (contact.phone?.trim()) L.push(`Phone: ${contact.phone}`);
  }

  L.push("", "ANSWERS");
  for (const a of answers) {
    if (a.questionId === "p_order_lookup" || a.value === NO_ORDER_VALUE) continue;
    const v = Array.isArray(a.value) ? a.value.join(", ") : a.value;
    L.push(`- ${a.prompt} -> ${v}`);
  }

  L.push("", "POSSIBLE CAUSES");
  diagnoses.forEach((d, i) => {
    L.push(`${i + 1}. ${d.title}`);
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
  contact,
  answers,
  spec,
  photos,
  onSubmitFeedback,
  onRestart,
}: {
  result: DiagnosisResult;
  order: SelectedOrder | null;
  contact: Contact | null;
  answers: AnswerRecord[];
  spec: SpecMatch | null;
  photos: File[];
  onSubmitFeedback: (
    feedback: RunFeedback,
    agentNotes?: string,
  ) => Promise<{ ok: boolean }>;
  onRestart: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const copySummary = async () => {
    const text = buildSummary(
      order,
      contact,
      answers,
      result.diagnoses,
      spec,
      notes,
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked (e.g. non-secure context) — no-op.
    }
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const payload = {
        generatedAt: new Date().toISOString(),
        order: order
          ? {
              orderName: order.orderName,
              processedAt: order.processedAt,
              fulfillmentStatus: order.fulfillmentStatus,
              product: { title: order.product.title, sku: order.product.sku },
            }
          : null,
        contact,
        spec: spec ? { model: spec.model, pdfUrl: spec.pdfUrl } : null,
        answers: answers
          .filter((a) => a.questionId !== "p_order_lookup")
          .map((a) => ({ prompt: a.prompt, value: a.value })),
        diagnoses: result.diagnoses.map((d) => ({
          title: d.title,
          summary: d.summary,
          steps: d.steps,
          partsTools: d.partsTools,
          escalation: d.escalation,
        })),
        notes: notes.trim() || undefined,
      };
      const res = await fetch("/api/run-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("pdf failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proline-troubleshooting-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // no-op; the agent can retry
    } finally {
      setPdfLoading(false);
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

  // Pull the customer's own description(s) — matches both "Please describe the
  // issue." and the path-level "Please briefly describe the issue."
  const describeText = answers
    .filter(
      (a) =>
        a.prompt.toLowerCase().includes("describe the issue") &&
        typeof a.value === "string" &&
        a.value.trim(),
    )
    .map((a) => a.value as string)
    .join("\n\n");
  const modelAnswer = answers.find((a) =>
    a.prompt.toLowerCase().startsWith("which proline hood"),
  );
  const caseDefaults: CaseDefaults = {
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    message: describeText,
    model:
      spec?.model ||
      (typeof modelAnswer?.value === "string" ? modelAnswer.value : "") ||
      order?.product.sku ||
      "",
    orderNumber: order?.orderName?.replace(/^#/, "") ?? "",
    troubleshootingSummary: buildSummary(
      order,
      null,
      answers,
      result.diagnoses,
      spec,
      notes,
    ),
  };

  return (
    <section className="py-2">
      <Eyebrow>Possible causes</Eyebrow>
      <h2 className="mt-5 text-3xl font-bold text-ink sm:text-4xl">
        Here&apos;s what we think.
      </h2>
      <p className="mt-3 max-w-xl text-muted">
        Based on the answers, here are the possible causes. Tap a cause to see
        the suggested fix.
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
          {contact && (
            <p className="truncate text-xs text-muted">
              {contact.name} · {contact.email}
            </p>
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
        <button
          type="button"
          onClick={downloadPdf}
          disabled={pdfLoading}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink disabled:opacity-50"
        >
          <Icon name="download" className="h-4 w-4" />
          {pdfLoading ? "Preparing…" : "Download PDF"}
        </button>
      </div>

      <div className="mt-7 space-y-3">
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

      <div className="mt-8">
        <SupportCaseForm defaults={caseDefaults} initialPhotos={photos} />
      </div>

      <div className="mt-10 border-t border-line pt-8">
        {submitted ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky text-white">
                <Icon name="check" className="h-4 w-4" strokeWidth={3} />
              </span>
              <h3 className="text-lg font-bold text-ink">Rating saved.</h3>
            </div>
            <p className="mt-2 text-sm text-muted">
              Thanks — this trains the tool and feeds the knowledge base.
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
