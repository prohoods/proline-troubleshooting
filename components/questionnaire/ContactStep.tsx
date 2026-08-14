"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import type { Contact } from "@/lib/storage/types";
import { ContactForm, isValidEmail } from "./inputs/ContactForm";

/**
 * Last-resort contact capture on the customer path.
 *
 * The flow only asks "How can we reach you?" when the customer couldn't find
 * their order; otherwise the name and email come from the Shopify order. That
 * covers almost everyone, but a guest checkout or a missing customer record can
 * leave one of them blank — and Stopgap rejects a case with no name. Rather
 * than fail at the last step, ask for what's missing.
 */
export function ContactStep({
  value,
  onChange,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  value: Contact | null;
  onChange: (c: Contact) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [touched, setTouched] = useState(false);
  const c = value ?? { name: "", email: "", phone: "" };
  const ready = c.name.trim().length > 0 && isValidEmail(c.email);

  return (
    <section>
      <Eyebrow>Almost done</Eyebrow>
      <h2 className="mt-5 text-xl font-bold leading-snug text-ink sm:text-2xl">
        Where should we send our answer?
      </h2>
      <p className="mt-2 text-sm text-muted">
        We couldn&apos;t pull your details from your order, so we just need these
        to reply.
      </p>

      <div className="mt-5">
        <ContactForm value={value} onChange={onChange} />
      </div>

      {touched && !ready && (
        <p className="mt-3 text-sm text-danger">
          Please enter your name and a valid email address.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-7 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <Icon name="arrowLeft" className="h-4 w-4" /> Back
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
