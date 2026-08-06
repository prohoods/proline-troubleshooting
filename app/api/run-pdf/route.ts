import { corsOrigin, corsPreflight } from "@/lib/cors";
import { getLogoBuffer } from "@/lib/pdf/logo";
import { buildRunPdf, type RunPdfData } from "@/lib/pdf/runPdf";

// Generates a branded PDF of a completed run (also reused to attach to the
// stopgap ticket). Node runtime — pdfkit is not edge-compatible.
export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

/** CORS headers for the plain Responses this route returns. */
function corsHeaders(request: Request): Record<string, string> {
  const origin = corsOrigin(request);
  return origin
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
    : {};
}

export async function POST(request: Request) {
  const cors = corsHeaders(request);
  let data: RunPdfData;
  try {
    data = (await request.json()) as RunPdfData;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: cors });
  }
  if (!data || typeof data !== "object") {
    return new Response("Invalid body", { status: 400, headers: cors });
  }

  try {
    const pdf = await buildRunPdf(data, getLogoBuffer());
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...cors,
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="proline-troubleshooting.pdf"',
      },
    });
  } catch (e) {
    console.error("[run-pdf] failed:", e instanceof Error ? e.message : e);
    return new Response("PDF generation failed", {
      status: 500,
      headers: cors,
    });
  }
}
