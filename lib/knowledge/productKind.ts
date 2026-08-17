/**
 * Tells a range apart from a range hood.
 *
 * The troubleshooting guide only covers hoods, but the storefront also sells
 * cooking appliances — PLSR freestanding ranges and PLST range tops. Someone
 * who bought one and lands here would otherwise be walked through ductwork and
 * baffle-filter questions that make no sense for their product, and the agent
 * would receive a ticket full of irrelevant answers.
 *
 * Detection is deliberately conservative: the cost of a false positive
 * (diverting a hood owner out of the guide) is much higher than the cost of a
 * false negative (a range owner answers a few odd questions before reaching
 * support anyway).
 */

/**
 * Model-code prefixes for cooking appliances, per the Resources catalogue.
 * No trailing boundary: a customer types "plsr36" as readily as "PLSR 36", and
 * \b never matches between a letter and a digit. No hood code begins PLSR/PLST.
 */
const RANGE_CODES = /\bPL(?:SR|ST)/i;

/**
 * Phrases that only appear on cooking appliances. "Range" alone is useless —
 * every hood on the site is a "range hood" — so each phrase here must be one
 * that cannot match a hood listing.
 */
const RANGE_PHRASES = [
  /\bfreestanding range\b/i,
  /\brange top\b/i,
  /\brangetop\b/i,
  /\bgas range\b/i,
  /\bdual[- ]fuel range\b/i,
  /\belectric range\b/i,
  /\binduction range\b/i,
  /\bcooktop\b/i,
  /\boven\b/i,
];

/** True when the text clearly identifies a cooking appliance, not a hood. */
export function looksLikeRange(...hints: (string | null | undefined)[]): boolean {
  for (const hint of hints) {
    if (!hint) continue;
    const t = hint.trim();
    if (!t) continue;
    // A hood listing can mention the range it sits above ("for gas ranges"),
    // so anything naming a hood is never treated as a range.
    if (/\brange hood\b|\bhood\b/i.test(t)) continue;
    if (RANGE_CODES.test(t)) return true;
    if (RANGE_PHRASES.some((re) => re.test(t))) return true;
  }
  return false;
}
