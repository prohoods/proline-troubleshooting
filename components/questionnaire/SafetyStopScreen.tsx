"use client";

import { Icon } from "@/components/ui/Icon";

/**
 * Hard stop on the ranges flow when the customer reports a gas or burning
 * emergency.
 *
 * Deliberately creates no ticket and sends no email. Everything else in this
 * app is built to end in a support case answered within one to two business
 * days; that cadence is wrong for a suspected gas leak, and offering it here
 * would imply the situation can wait. The only job of this screen is to get
 * the customer out of the building and on the phone to someone who can help
 * in minutes.
 */
export function SafetyStopScreen({ onBack }: { onBack: () => void }) {
  return (
    <section>
      <div className="rounded-2xl border-2 border-danger bg-danger/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white">
            <Icon name="alert" className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-snug text-ink sm:text-2xl">
              Stop and leave the building now.
            </h2>
            <p className="mt-3 text-ink">
              Don&apos;t switch anything on or off — including light switches —
              and don&apos;t use your phone indoors.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink">
              <li>Get everyone outside, away from the building.</li>
              <li>
                From outside, call your gas utility&apos;s emergency line, or{" "}
                <span className="font-bold">911</span>.
              </li>
              <li>
                Don&apos;t go back inside until they tell you it&apos;s safe.
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-mist p-5 text-sm">
        <p className="font-bold text-ink">Once you&apos;re safe</p>
        <p className="mt-1.5 text-muted">
          Get in touch and we&apos;ll pick it up from there —{" "}
          <a
            href="mailto:support@prolinerangehoods.com"
            className="font-medium text-sky hover:text-sky-dark"
          >
            support@prolinerangehoods.com
          </a>{" "}
          or{" "}
          <a
            href="tel:+18449454166"
            className="font-medium text-sky hover:text-sky-dark"
          >
            844-945-4166
          </a>
          . We haven&apos;t created a support request, because this needs a
          faster answer than we can give by email.
        </p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-7 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" /> That&apos;s not my
        situation — go back
      </button>
    </section>
  );
}
