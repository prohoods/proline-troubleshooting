import { readFileSync } from "node:fs";
import { join } from "node:path";

// The official logo, read once per serverless instance, for embedding in PDFs.
let cache: Buffer | null | undefined;

export function getLogoBuffer(): Buffer | null {
  if (cache !== undefined) return cache;
  try {
    cache = readFileSync(
      join(process.cwd(), "public/brand/Proline_Kitchen_Appliances-blk.png"),
    );
  } catch {
    cache = null;
  }
  return cache;
}
