import { PRODUCT_GUIDES } from "./productGuidesData";
import { SPEC_SHEETS } from "./specSheetsData";

export interface SpecMatch {
  model: string;
  text: string;
  /** The "Read more here" spec-sheet PDF URL parsed from the text, if present. */
  pdfUrl?: string;
  /** Install manual from the storefront's Resources page, when one exists. */
  installGuideUrl?: string;
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Proline model codes look like PLJW104 / PLFW832 / PLSW755 (PL + 2-3 letters +
// 3 digits). Variant suffixes (F, RC, RK, J…) live after the digits.
const CODE = /PL[A-Z]{2,3}\d{3}/;
const codeOf = (s: string): string | null => norm(s).match(CODE)?.[0] ?? null;

/** The 3-digit model number ("PLJW 121" → "121"), for bare-number lookups. */
const numberOf = (s: string): string | null =>
  codeOf(s)?.match(/\d{3}$/)?.[0] ?? null;

interface Entry {
  model: string;
  text: string;
  normKey: string;
  code: string | null;
}

const ENTRIES: Entry[] = Object.entries(SPEC_SHEETS).map(([model, text]) => ({
  model,
  text,
  normKey: norm(model),
  code: codeOf(model),
}));

/**
 * Find the spec sheet for a product from loose hints (Shopify title, SKU, a
 * model typed by the user…). Matches on the model code, then disambiguates
 * variants (e.g. 755F vs 755RC) by checking which key the hint actually spells
 * out. Returns null when nothing matches — the caller proceeds without a spec.
 */
export function findSpec(hints: (string | null | undefined)[]): SpecMatch | null {
  const clean = hints.filter((h): h is string => Boolean(h && h.trim()));
  if (clean.length === 0) return null;

  const normHints = clean.map(norm);
  const hintCodes = new Set(clean.map(codeOf).filter(Boolean) as string[]);

  let candidates = ENTRIES.filter((e) => e.code && hintCodes.has(e.code));

  // Customers routinely type just the number ("121") rather than the full code,
  // which otherwise matches nothing and leaves them with no spec sheet. Resolve
  // a bare number only when exactly one model carries it — 13 of the 27 numbers
  // are shared across models, and a confident wrong spec is worse than none.
  //
  // Deliberately strict: the hint must be the number and nothing else. Shopify
  // titles and SKUs are full of incidental digits ("1200 CFM", "36 inch"), and
  // substring matching against those produces silent mis-identification.
  if (candidates.length === 0) {
    for (const h of normHints) {
      if (!/^\d{3}$/.test(h)) continue;
      const byNumber = ENTRIES.filter((e) => numberOf(e.model) === h);
      if (byNumber.length === 1) {
        candidates = byNumber;
        break;
      }
    }
  }

  if (candidates.length === 0) return null;

  // Prefer the variant whose full key the hint actually contains (longest first),
  // else fall back to the base model (shortest key).
  const variant = candidates
    .filter((e) => normHints.some((h) => h.includes(e.normKey)))
    .sort((a, b) => b.normKey.length - a.normKey.length)[0];
  const pick =
    variant ??
    [...candidates].sort((a, b) => a.normKey.length - b.normKey.length)[0];

  const guides = guidesFor(pick.model);
  return {
    model: pick.model,
    text: pick.text,
    // Prefer the spec sheet the Resources page publishes — it's the one the
    // support team maintains — and fall back to the "Read more here" link
    // embedded in the spec text.
    pdfUrl:
      guides?.specSheet ?? pick.text.match(/https?:\/\/\S+?\.pdf/i)?.[0],
    installGuideUrl: guides?.installGuide,
  };
}

/**
 * Documents for a model, matched on the model code so the two sources can
 * disagree on naming — the spec sheets call it "PLJW 185 Slim" while the
 * Resources page calls it "PLJW 185". Falls back to an exact name match for
 * products with no code at all (roof caps, dampers, blowers).
 */
function guidesFor(model: string) {
  const code = codeOf(model);
  if (code) {
    for (const [key, value] of Object.entries(PRODUCT_GUIDES)) {
      if (codeOf(key) === code) return value;
    }
  }
  const exact = Object.entries(PRODUCT_GUIDES).find(
    ([key]) => norm(key) === norm(model),
  );
  return exact?.[1];
}
