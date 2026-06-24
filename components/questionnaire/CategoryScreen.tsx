"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { categories, type Category } from "@/lib/flow";

export function CategoryScreen({
  onPick,
  onBack,
}: {
  onPick: (category: Category) => void;
  onBack: () => void;
}) {
  const [unavailable, setUnavailable] = useState<Category | null>(null);

  if (unavailable) {
    return (
      <section className="py-4">
        <Eyebrow>{unavailable.label}</Eyebrow>
        <h2 className="mt-5 text-3xl font-bold text-ink sm:text-4xl">
          Coming soon.
        </h2>
        <p className="mt-4 max-w-lg text-muted">
          Troubleshooting for {unavailable.label.toLowerCase()} isn&apos;t
          available yet — we&apos;re starting with range hoods. Check back soon.
        </p>
        <div className="mt-8">
          <Button variant="secondary" onClick={() => setUnavailable(null)}>
            <Icon name="arrowLeft" className="h-4 w-4" /> Back to options
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4">
      <Eyebrow>Step 1</Eyebrow>
      <h2 className="mt-5 text-3xl font-bold text-ink sm:text-4xl">
        What are you troubleshooting?
      </h2>
      <p className="mt-4 text-muted">Choose the product you need help with.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => (c.available ? onPick(c) : setUnavailable(c))}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border border-line bg-white p-8 text-center transition hover:border-sky hover:shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/icons/${c.id}.svg`}
              alt=""
              className={`aspect-square w-full max-w-[200px] object-contain ${
                c.available ? "" : "opacity-40"
              }`}
            />
            <span className="text-xl font-bold text-ink">{c.label}</span>
            <span className="max-w-xs text-sm text-muted">{c.blurb}</span>
            {!c.available && (
              <span className="absolute right-4 top-4 rounded-full bg-mist px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
                Coming soon
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <Icon name="arrowLeft" className="h-4 w-4" /> Back
        </button>
      </div>
    </section>
  );
}
