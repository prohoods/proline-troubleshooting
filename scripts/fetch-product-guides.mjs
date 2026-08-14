/*
 * Regenerates lib/knowledge/productGuidesData.ts from the storefront's
 * Resources page, which is where Proline actually maintains the per-model
 * Install Guide and Spec Sheet PDFs.
 *
 *   node scripts/fetch-product-guides.mjs
 *
 * Re-run it after adding products or replacing a manual. The links are
 * protocol-relative in the page markup and carry a ?v= cache-buster; both are
 * preserved here so the URL keeps pointing at the exact file the site serves.
 */
import { writeFileSync } from "node:fs";

const SOURCE = "https://prolinerangehoods.com/pages/resources";
const OUT = new URL("../lib/knowledge/productGuidesData.ts", import.meta.url);

const html = await (await fetch(SOURCE)).text();

// <a class="pih-act" … data-mt="MODEL" href="URL" …><svg…/><span class="g">LABEL</span></a>
const LINK =
  /<a class="pih-act"[^>]*data-mt="([^"]+)"[^>]*href="([^"]+)"[^>]*>.*?<span class="g">([^<]+)<\/span>/gs;

// Model names come out of the markup HTML-escaped (e.g. `12&quot; BBQ ROOF CAP`).
const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

const byModel = new Map();
for (const [, model, url, label] of html.matchAll(LINK)) {
  const key = decode(model);
  const entry = byModel.get(key) ?? {};
  const abs = url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim();
  if (/install/i.test(label)) entry.installGuide = abs;
  else if (/spec/i.test(label)) entry.specSheet = abs;
  byModel.set(key, entry);
}

const sorted = [...byModel.entries()].sort(([a], [b]) => a.localeCompare(b));
const withInstall = sorted.filter(([, v]) => v.installGuide).length;

const body = `// GENERATED — do not edit by hand.
// Run: node scripts/fetch-product-guides.mjs
//
// Per-model documents scraped from ${SOURCE},
// which is where these are maintained. ${sorted.length} products,
// ${withInstall} with an install guide.

export interface ProductGuides {
  installGuide?: string;
  specSheet?: string;
}

export const PRODUCT_GUIDES: Record<string, ProductGuides> = {
${sorted
  .map(
    ([model, v]) =>
      `  ${JSON.stringify(model)}: {${v.installGuide ? `\n    installGuide: ${JSON.stringify(v.installGuide)},` : ""}${v.specSheet ? `\n    specSheet: ${JSON.stringify(v.specSheet)},` : ""}\n  },`,
  )
  .join("\n")}
};
`;

writeFileSync(OUT, body);
console.log(
  `wrote ${sorted.length} products (${withInstall} install guides) to lib/knowledge/productGuidesData.ts`,
);
