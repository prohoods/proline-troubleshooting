"use client";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import type { SpecMatch } from "@/lib/knowledge/specSheets";

/**
 * Terminal screen of the customer flow. The customer is never shown a
 * diagnosis — the answers, photos, scripted causes, and the AI pre-diagnosis
 * all go to the agent, who replies with model-specific guidance.
 */
export function TicketSentScreen({
  caseId,
  email,
  attachedImages,
  spec,
  onRestart,
}: {
  caseId: number | null;
  email: string;
  attachedImages: number;
  /** Matched product, for the reference documents. Null when we couldn't
   *  identify the model — the block is hidden rather than showing dead links. */
  spec: SpecMatch | null;
  onRestart: () => void;
}) {
  return (
    <section>
      <Eyebrow>Request sent</Eyebrow>

      <div className="mt-5 flex items-start gap-3">
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky text-white">
          <Icon name="check" className="h-5 w-5" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold leading-snug text-ink sm:text-3xl">
            Thanks — we&apos;ve got everything we need.
          </h2>
          <p className="mt-3 text-muted">
            A Proline specialist will email you within one business day.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-mist p-5 text-sm">
        {caseId !== null && (
          <p className="text-ink">
            <span className="font-semibold">Reference:</span> case #{caseId}
          </p>
        )}
        {email && (
          <p className="mt-1.5 text-muted">
            We&apos;ll reply to <span className="font-medium text-ink">{email}</span>.
          </p>
        )}
        <p className="mt-1.5 text-muted">
          Your answers{attachedImages > 0 ? ` and ${attachedImages} photo${attachedImages > 1 ? "s" : ""}` : ""}{" "}
          went across with it, so you won&apos;t be asked to repeat any of it.
        </p>
      </div>

      {spec && (spec.installGuideUrl || spec.pdfUrl) && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <p className="text-sm font-bold text-ink">
            Your {spec.model} documents
          </p>
          <p className="mt-1 text-sm text-muted">
            Worth a look while you wait — installation steps, specifications,
            and duct requirements.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {spec.installGuideUrl && (
              <a
                href={spec.installGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-field bg-mist px-4 py-3 text-sm font-semibold text-ink transition hover:border-sky hover:bg-white"
              >
                <Icon name="download" className="h-4 w-4 shrink-0" />
                Install guide (PDF)
              </a>
            )}
            {spec.pdfUrl && (
              <a
                href={spec.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-field bg-mist px-4 py-3 text-sm font-semibold text-ink transition hover:border-sky hover:bg-white"
              >
                <Icon name="download" className="h-4 w-4 shrink-0" />
                Spec sheet (PDF)
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mt-7 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-bold">While you wait</p>
        <p className="mt-1">
          Leave the hood switched off at the breaker if it&apos;s behaving
          unpredictably, and don&apos;t open the motor housing or touch internal
          wiring — that&apos;s work for a licensed professional.
        </p>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-sky hover:text-sky-dark"
      >
        <Icon name="restart" className="h-4 w-4" /> Troubleshoot another issue
      </button>
    </section>
  );
}
