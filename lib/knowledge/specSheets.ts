import { SPEC_SHEETS } from "./specSheetsData";

export interface SpecMatch {
  model: string;
  text: string;
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Proline model codes look like PLJW104 / PLFW832 / PLSW755 (PL + 2-3 letters +
// 3 digits). Variant suffixes (F, RC, RK, J…) live after the digits.
const CODE = /PL[A-Z]{2,3}\d{3}/;
const codeOf = (s: string): string | null => norm(s).match(CODE)?.[0] ?? null;

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

  const candidates = ENTRIES.filter((e) => e.code && hintCodes.has(e.code));
  if (candidates.length === 0) return null;

  // Prefer the variant whose full key the hint actually contains (longest first),
  // else fall back to the base model (shortest key).
  const variant = candidates
    .filter((e) => normHints.some((h) => h.includes(e.normKey)))
    .sort((a, b) => b.normKey.length - a.normKey.length)[0];
  const pick =
    variant ??
    [...candidates].sort((a, b) => a.normKey.length - b.normKey.length)[0];

  return { model: pick.model, text: pick.text };
}
