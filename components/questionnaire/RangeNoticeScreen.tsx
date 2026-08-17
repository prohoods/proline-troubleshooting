"use client";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

/**
 * Shown when someone in the hood guide turns out to own a range or cooktop.
 *
 * Before the Ranges questionnaire existed this collected details and opened a
 * case directly. Now it just hands them over to the right guide — a switch
 * rather than a dead end, and they keep the order they already found.
 */
export function RangeNoticeScreen({
  productLabel,
  onSwitch,
  onDismiss,
}: {
  productLabel: string | null;
  onSwitch: () => void;
  /** Escape hatch: detection is conservative, but a typo shouldn't strand anyone. */
  onDismiss: () => void;
}) {
  return (
    <section>
      <Eyebrow>Ranges &amp; cooktops</Eyebrow>
      <h2 className="mt-5 text-xl font-bold leading-snug text-ink sm:text-2xl">
        That&apos;s a Proline range, not a range hood.
      </h2>
      <p className="mt-3 text-muted">
        {productLabel ? `We found ${productLabel}. ` : ""}This guide asks about
        ducting and filters, which won&apos;t apply to your appliance. We have a
        separate guide for ranges and cooktops — it takes about two minutes, and
        you won&apos;t need to look up your order again.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onDismiss}
          className="text-left text-sm font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          This is actually a range hood
        </button>
        <Button onClick={onSwitch}>
          Switch to the range guide
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
