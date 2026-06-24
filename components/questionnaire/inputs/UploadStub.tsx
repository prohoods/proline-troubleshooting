"use client";

import { useRef } from "react";
import type { Option } from "@/lib/flow/types";

/**
 * Upload UI is stubbed for v1 (decision: capture intent, not binaries). We record
 * the chosen filenames so the run is complete; wiring real storage later (e.g.
 * Vercel Blob) means swapping the onChange handler — the rest stays the same.
 */
export function UploadStub({
  value = [],
  onChange,
  options,
}: {
  value?: string[];
  onChange: (value: string[]) => void;
  options?: Option[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    onChange([...value, ...Array.from(files).map((f) => f.name)]);
  };
  const removeAt = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {options?.length ? (
        <div className="mb-3 rounded-xl bg-mist p-4 text-sm">
          <p className="font-semibold text-ink">Please include:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {options.map((o) => (
              <li key={o.value}>{o.label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-white px-4 py-7 text-center transition hover:border-sky/60"
      >
        <span className="font-semibold text-ink">Choose photos or video</span>
        <span className="text-xs text-muted">
          Files aren&apos;t uploaded in this version — we just note the filenames
          for now.
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {value.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {value.map((name, i) => (
            <li
              key={`${name}-${i}`}
              className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-3 py-1 text-sm text-ink"
            >
              <span className="max-w-[14rem] truncate">{name}</span>
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => removeAt(i)}
                className="text-muted hover:text-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
