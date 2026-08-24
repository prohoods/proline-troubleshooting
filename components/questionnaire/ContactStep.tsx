"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { TurnstileWidget, turnstileEnabled } from "@/components/ui/TurnstileWidget";
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
  onToken,
  tokenReady,
  videoProgress,
  botResetSignal,
  onBotUnavailable,
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
  onToken: (token: string | null) => void;
  /** False while the bot check is still running. */
  tokenReady: boolean;
  /** 0-100 while a video is still uploading; null when nothing is pending. */
  videoProgress: number | null;
  /** Bumped after a failed send, to replace the pass that was just spent. */
  botResetSignal: number;
  /** The bot check couldn't run — stop waiting on it. */
  onBotUnavailable: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const c = value ?? { name: "", email: "", phone: "" };
  const detailsOk = c.name.trim().length > 0 && isValidEmail(c.email);
  // Submitting before Cloudflare has issued its pass gets a hard rejection from
  // the server, which reads as a broken form on the very last step. Wait for it.
  const waitingOnCheck = turnstileEnabled() && !tokenReady;
  // Sending now would file the case without the video, and the customer would
  // have no idea it was left behind. They're on the last screen anyway, so the
  // remaining seconds cost nothing.
  const waitingOnVideo = videoProgress !== null;
  const ready = detailsOk && !waitingOnCheck && !waitingOnVideo;

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

      <p className="mt-4 text-xs leading-relaxed text-muted">
        We use these details to answer your request and nothing else. Your
        answers, photos and video are stored with your support case — see our{" "}
        <a
          href="https://prolinerangehoods.com/pages/privacy-statement"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky underline-offset-2 hover:underline"
        >
          Privacy Statement
        </a>
        .
      </p>

      <TurnstileWidget
        onToken={onToken}
        resetSignal={botResetSignal}
        onUnavailable={onBotUnavailable}
      />

      {touched && !detailsOk && (
        <p className="mt-3 text-sm text-danger">
          Please enter your name and a valid email address.
        </p>
      )}
      {detailsOk && waitingOnCheck && (
        <p className="mt-3 text-sm text-muted">
          Just a moment — we&apos;re checking you&apos;re not a robot. If a
          checkbox appears below, tick it to continue.
        </p>
      )}
      {detailsOk && waitingOnVideo && (
        <div className="mt-3">
          <p className="text-sm text-muted">
            Finishing your video upload — {Math.round(videoProgress)}%. Please
            keep this page open.
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-sky transition-all"
              style={{ width: `${Math.max(3, Math.round(videoProgress))}%` }}
            />
          </div>
        </div>
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
          disabled={submitting || waitingOnCheck || waitingOnVideo}
        >
          {submitting
            ? "Sending…"
            : waitingOnVideo
              ? "Uploading video…"
              : waitingOnCheck
                ? "Checking…"
                : "Send to support"}
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
