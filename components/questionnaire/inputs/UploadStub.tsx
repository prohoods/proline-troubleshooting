"use client";

import { useRef } from "react";
import type { Option } from "@/lib/flow/types";

/**
 * Photo/video picker. Holds the actual File objects (lifted via onFilesChange so
 * they can be attached to a support case at the end) and mirrors the filenames
 * into the run answer via onChange.
 */
export function UploadStub({
  options,
  files = [],
  onFilesChange,
  onChange,
}: {
  options?: Option[];
  value?: string[];
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  onChange: (value: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (next: File[]) => {
    onFilesChange?.(next);
    onChange(next.map((f) => f.name));
  };
  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    commit([...files, ...Array.from(list)]);
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeAt = (i: number) => commit(files.filter((_, idx) => idx !== i));

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
          Photos are attached when you create a support case.
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

      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-3 py-1 text-sm text-ink"
            >
              <span className="max-w-[14rem] truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
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
