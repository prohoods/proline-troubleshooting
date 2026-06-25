import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildRunPdf, type RunPdfData } from "@/lib/pdf/runPdf";

// Generates a branded PDF of a completed run (also reused later to attach to the
// stopgap ticket). Node runtime — pdfkit is not edge-compatible.
export const runtime = "nodejs";

// Read the logo once per instance.
let logoCache: Buffer | null | undefined;
function logoBuffer(): Buffer | null {
  if (logoCache !== undefined) return logoCache;
  try {
    logoCache = readFileSync(
      join(process.cwd(), "public/brand/Proline_Kitchen_Appliances-blk.png"),
    );
  } catch {
    logoCache = null;
  }
  return logoCache;
}

export async function POST(request: Request) {
  let data: RunPdfData;
  try {
    data = (await request.json()) as RunPdfData;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!data || typeof data !== "object") {
    return new Response("Invalid body", { status: 400 });
  }

  try {
    const pdf = await buildRunPdf(data, logoBuffer());
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="proline-troubleshooting.pdf"',
      },
    });
  } catch (e) {
    console.error("[run-pdf] failed:", e instanceof Error ? e.message : e);
    return new Response("PDF generation failed", { status: 500 });
  }
}
