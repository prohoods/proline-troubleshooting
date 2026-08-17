"use client";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

/**
 * Shown when the product doesn't match the guide the customer is in — a range
 * in the hood guide, or a hood in the ranges guide.
 *
 * Hands them to the right questionnaire rather than dead-ending them, and the
 * order they already found comes across with them.
 */
export function MisroutedScreen({
  productLabel,
  target,
  onSwitch,
  onDismiss,
}: {
  productLabel: string | null;
  /** The guide they should be in. */
  target: "ranges" | "range_hood";
  onSwitch: () => void;
  /** Escape hatch: detection is conservative, but a typo shouldn't strand anyone. */
  onDismiss: () => void;
}) {
  const toRanges = target === "ranges";
  return (
    <section>
      <Eyebrow>{toRanges ? "Ranges & cooktops" : "Range hoods"}</Eyebrow>
      <h2 className="mt-5 text-xl font-bold leading-snug text-ink sm:text-2xl">
        {toRanges
          ? "That's a Proline range, not a range hood."
          : "That's a Proline range hood, not a range."}
      </h2>
      <p className="mt-3 text-muted">
        {productLabel ? `We found ${productLabel}. ` : ""}
        {toRanges
          ? "This guide asks about ducting and filters, which won't apply to your appliance."
          : "This guide asks about burners and ovens, which won't apply to your hood."}{" "}
        We have a separate guide for{" "}
        {toRanges ? "ranges and cooktops" : "range hoods"} — it takes about two
        minutes, and you won&apos;t need to look up your order again.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onDismiss}
          className="text-left text-sm font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {toRanges ? "This is actually a range hood" : "This is actually a range"}
        </button>
        <Button onClick={onSwitch}>
          {toRanges ? "Switch to the range guide" : "Switch to the hood guide"}
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
