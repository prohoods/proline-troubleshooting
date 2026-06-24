import { Flame } from "./Flame";

type Tone = "brand" | "white" | "mono";

/**
 * Primary lockup: flame mark + "PROLINE" wordmark with "KITCHEN APPLIANCES"
 * subtitle, set in Montserrat (the brand typeface). Treatments:
 *  - "brand": Sky Blue flame + ink wordmark, for white/light surfaces
 *  - "white": all white, for Sky Blue / dark surfaces
 *  - "mono":  all black, matching the official Kitchen Appliances lockup
 */
export function Logo({
  tone = "brand",
  showTagline = true,
  className = "",
}: {
  tone?: Tone;
  showTagline?: boolean;
  className?: string;
}) {
  const flameColor =
    tone === "white" ? "text-white" : tone === "mono" ? "text-ink" : "text-sky";
  const wordColor = tone === "white" ? "text-white" : "text-ink";
  const tagColor =
    tone === "white"
      ? "text-white/80"
      : tone === "mono"
        ? "text-ink"
        : "text-muted";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Flame className={`h-7 w-auto shrink-0 ${flameColor}`} />
      <span className="flex flex-col leading-none">
        <span
          className={`text-[1.3rem] font-extrabold tracking-[0.08em] ${wordColor}`}
        >
          PROLINE
        </span>
        {showTagline && (
          <span
            className={`mt-1 text-[0.5rem] font-semibold tracking-[0.14em] ${tagColor}`}
          >
            KITCHEN APPLIANCES
          </span>
        )}
      </span>
    </span>
  );
}
