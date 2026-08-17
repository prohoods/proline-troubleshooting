"use client";

import { useId, useState } from "react";

/**
 * A "?" beside a question that reveals a plain-language explainer.
 *
 * Tap-to-toggle rather than hover: most of this is read on a phone standing in
 * a kitchen, and hover-only help is invisible on touch. Rendered inline with
 * the prompt so it reads as part of the question rather than as chrome.
 */
export function HelpToggle({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Hide explanation" : "What does this mean?"}
        className={`ml-2 inline-flex h-6 w-6 shrink-0 translate-y-[-2px] items-center justify-center rounded-full border text-xs font-bold transition ${
          open
            ? "border-sky bg-sky text-white"
            : "border-field bg-mist text-muted hover:border-sky hover:text-sky"
        }`}
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          className="mt-3 block rounded-xl border border-sky/40 bg-sky-soft p-4 text-sm font-normal leading-relaxed text-ink"
        >
          {text}
        </span>
      )}
    </>
  );
}
