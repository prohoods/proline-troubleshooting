"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import type { Contact } from "@/lib/storage/types";
import { ContactForm, isValidEmail } from "./inputs/ContactForm";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/bmp",
]);
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Shown when the identified product is a cooking appliance rather than a hood.
 *
 * The questionnaire is entirely about hoods — ductwork, baffle filters,
 * termination caps — so walking a range owner through it wastes their time and
 * hands the agent a ticket full of irrelevant answers. Until the Ranges
 * questionnaire exists, this collects the essentials and opens a case flagged
 * as a range, which beats dead-ending them at a "coming soon" notice.
 */
export function RangeNoticeScreen({
  productLabel,
  contact,
  onContact,
  description,
  onDescription,
  photos,
  onPhotos,
  onSubmit,
  onDismiss,
  submitting,
  error,
  onToken,
}: {
  productLabel: string | null;
  contact: Contact | null;
  onContact: (c: Contact) => void;
  description: string;
  onDescription: (v: string) => void;
  photos: File[];
  onPhotos: (files: File[]) => void;
  onSubmit: () => void;
  /** Escape hatch: detection is conservative, but a typo shouldn't strand anyone. */
  onDismiss: () => void;
  submitting: boolean;
  error: string | null;
  onToken: (token: string | null) => void;
}) {
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const c = contact ?? { name: "", email: "", phone: "" };
  const ready =
    c.name.trim().length > 0 && isValidEmail(c.email) && description.trim().length > 0;

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...photos];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_IMAGES) break;
      if (!IMAGE_TYPES.has(f.type) || f.size === 0 || f.size > MAX_IMAGE_BYTES) continue;
      next.push(f);
    }
    onPhotos(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section>
      <Eyebrow>Ranges &amp; cooktops</Eyebrow>
      <h2 className="mt-5 text-xl font-bold leading-snug text-ink sm:text-2xl">
        That&apos;s a Proline range, not a range hood.
      </h2>
      <p className="mt-3 text-muted">
        {productLabel ? `We found ${productLabel}. ` : ""}This guide only covers
        range hoods, so its questions wouldn&apos;t apply to your appliance.
        Tell us what&apos;s happening instead and we&apos;ll put a specialist on
        it directly.
      </p>

      <div className="mt-6">
        <ContactForm value={contact} onChange={onContact} />
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-ink">
          What&apos;s happening?
        </span>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="Tell us what the range is doing, in your own words…"
          className="mt-1 w-full resize-y rounded-xl border border-field bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-sky focus:outline-none"
        />
      </label>

      <div className="mt-4">
        <span className="mb-1 block text-sm font-medium text-ink">
          Photos or video stills (optional)
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-field bg-mist px-4 py-4 text-sm font-semibold text-ink transition hover:border-sky hover:bg-white"
        >
          + Add photos
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        {photos.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {photos.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-3 py-1 text-sm text-ink"
              >
                <span className="max-w-[192px] truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => onPhotos(photos.filter((_, idx) => idx !== i))}
                  className="text-muted hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TurnstileWidget onToken={onToken} />

      {touched && !ready && (
        <p className="mt-3 text-sm text-danger">
          Please enter your name, a valid email address, and a short description.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-7 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onDismiss}
          className="text-left text-sm font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          This is actually a range hood
        </button>
        <Button
          onClick={() => {
            setTouched(true);
            if (ready) onSubmit();
          }}
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Send to support"}
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
