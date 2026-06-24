"use client";

import { Icon } from "@/components/ui/Icon";
import type { Option } from "@/lib/flow/types";

export function MultiSelect({
  options,
  value = [],
  onChange,
  label,
}: {
  options: Option[];
  value?: string[];
  onChange: (value: string[]) => void;
  label?: string;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2.5">
      <p className="text-xs text-muted">Select all that apply.</p>
      {options.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => toggle(opt.value)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
              selected
                ? "border-sky bg-sky-soft"
                : "border-line bg-white hover:border-sky/50"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                selected
                  ? "border-sky bg-sky text-white"
                  : "border-line text-transparent"
              }`}
            >
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className="font-medium text-ink">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
