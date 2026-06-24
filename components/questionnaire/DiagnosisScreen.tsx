"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import type { DiagnosisResult } from "@/lib/diagnoses/resolve";
import { LIKELIHOOD_LABEL, type Diagnosis } from "@/lib/diagnoses/types";
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

export function DiagnosisScreen({
  result,
  onSubmitFeedback,
  onRestart,
}: {
  result: DiagnosisResult;
  onSubmitFeedback: (feedback: RunFeedback) => Promise<{ ok: boolean }>;
  onRestart: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);

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

      <div className="mt-7 space-y-4">
        {result.diagnoses.map((d) => (
          <DiagnosisCard key={d.id} d={d} />
        ))}
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
                const r = await onSubmitFeedback(fb);
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
