import { getLogoBuffer } from "@/lib/pdf/logo";
import { buildRunPdf, type RunPdfData } from "@/lib/pdf/runPdf";

// Generates a branded PDF of a completed run (also reused to attach to the
// stopgap ticket). Node runtime — pdfkit is not edge-compatible.
export const runtime = "nodejs";

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
    const pdf = await buildRunPdf(data, getLogoBuffer());
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
