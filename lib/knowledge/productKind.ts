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
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

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

/**
 * Hood model prefixes, taken from the spec-sheet catalogue rather than a
 * pattern — a generic /PL[A-Z]{2,3}/ also matches ordinary words like "PLUS".
 * PLSR and PLST are deliberately absent: those are the cooking appliances.
 */
const HOOD_PREFIXES = [
  "PLFI",
  "PLFL",
  "PLFW",
  "PLGI",
  "PLGL",
  "PLGW",
  "PLJI",
  "PLJL",
  "PLJW",
  "PLSI",
  "PLSW",
];

/** Hood product families that carry no PL code. */
const HOOD_NAMES = [
  /\brange hood\b/i,
  /\bhood\b/i,
  /\binsert\b/i,
  /\bliner\b/i,
  /\bchimney\b/i,
  /\bblower\b/i,
  /\bbaffle filter\b/i,
  /\bhurricane\b/i,
  /\bvexair\b/i,
  /\brecirc\b/i,
  /\bprosi\b|\bprosw\b|\bprovi\b|\bprov\b/i,
  // The BBQ line is outdoor hoods, not grills.
  /\bbbq\b/i,
  /\bunder-?cabinet\b/i,
  /\bwall mount\b/i,
  /\bisland\b/i,
];

/**
 * True when the text clearly identifies a range hood, not a cooking appliance.
 *
 * The mirror of looksLikeRange, for someone who lands in the Ranges guide with
 * a hood. Same bias: a false positive drags a range owner into the wrong guide,
 * which is worse than a false negative, so anything naming a range or cooktop
 * is never treated as a hood.
 */
export function looksLikeHood(...hints: (string | null | undefined)[]): boolean {
  for (const hint of hints) {
    if (!hint) continue;
    const t = hint.trim();
    if (!t) continue;
    if (looksLikeRange(t)) continue;
    // Compare on the normalised form so "PLJW 104", "pljw-104", and "PLJW104"
    // all read the same.
    if (HOOD_PREFIXES.some((code) => norm(t).includes(code))) return true;
    if (HOOD_NAMES.some((re) => re.test(t))) return true;
  }
  return false;
}

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
