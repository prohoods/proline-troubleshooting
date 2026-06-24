"use client";

import { type KeyboardEvent, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Option } from "@/lib/flow/types";

export function SingleSelect({
  options,
  value,
  onChange,
  label,
}: {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  // Roving tabindex: only one button is tabbable; arrows move between them.
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight")
      next = (i + 1) % options.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = (i - 1 + options.length) % options.length;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2.5">
      {options.map((opt, i) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            ref={(el) => {
              refs.current[i] = el;
            }}
            tabIndex={i === focusIndex ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition ${
              selected
                ? "border-sky bg-sky-soft"
                : "border-line bg-white hover:border-sky/50"
            }`}
          >
            <span className="font-medium text-ink">{opt.label}</span>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selected
                  ? "border-sky bg-sky text-white"
                  : "border-line text-transparent"
              }`}
            >
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
