"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import type { Contact } from "@/lib/storage/types";
import { ContactForm, isValidEmail } from "./inputs/ContactForm";

/**
 * Final confirmation before the ticket is created.
 *
 * Shown to everyone, because the reply address is usually inherited from the
 * Shopify order and an order can be years old — the customer should see where
 * the answer is going before it's sent, not after. It doubles as the capture
 * step when the order gave us nothing usable: a guest checkout can leave the
 * name blank, and Stopgap rejects a case without one.
 */
export function ContactStep({
  value,
  onChange,
  onSubmit,
  onBack,
  submitting,
  error,
  complete,
}: {
  value: Contact | null;
  onChange: (c: Contact) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
  /** True when the order already gave us usable details — changes the ask from
   *  "we need these" to "check these are right". */
  complete: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const c = value ?? { name: "", email: "", phone: "" };
  const ready = c.name.trim().length > 0 && isValidEmail(c.email);

  return (
    <section>
      <Eyebrow>Almost done</Eyebrow>
      <h2 className="mt-5 text-xl font-bold leading-snug text-ink sm:text-2xl">
        {complete ? "Is this your info?" : "Where should we send our answer?"}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {complete
          ? "This is what we have from your order. Change anything that's out of date — this is where our reply goes."
          : "We couldn't pull your details from your order, so we just need these to reply."}
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
