import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { findSpec } from "@/lib/knowledge/specSheets";
import { getLogoBuffer } from "@/lib/pdf/logo";
import { buildRunPdf, type RunPdfData } from "@/lib/pdf/runPdf";
import { storage } from "@/lib/storage";
import { blobConfigured, uploadRunPdf } from "@/lib/storage/blob";
import { postgresConfigured } from "@/lib/storage/postgres";
import type {
  RunRecord,
  StoredAnswer,
  StoredDiagnosis,
} from "@/lib/storage/types";

// Single ingress point for completed runs. Renders + stores the PDF, then
// persists the run via the storage module.
export const runtime = "nodejs";

function buildPdfData(record: RunRecord): RunPdfData {
  const spec = findSpec([
    record.order?.product.title,
    record.order?.product.sku,
    record.model,
  ]);
  return {
    generatedAt: record.createdAt,
    order: record.order
      ? {
          orderName: record.order.orderName,
          processedAt: record.order.processedAt,
          fulfillmentStatus: record.order.fulfillmentStatus,
          product: {
            title: record.order.product.title,
            sku: record.order.product.sku,
          },
        }
      : null,
    contact: record.contact ?? null,
    spec: spec ? { model: spec.model, pdfUrl: spec.pdfUrl } : null,
    answers: record.answers,
    diagnoses: record.diagnoses,
    notes: record.agentNotes,
  };
}

export async function POST(request: Request) {
  let body: Partial<RunRecord>;
  try {
    body = (await request.json()) as Partial<RunRecord>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || !body.category) {
    return NextResponse.json(
      { ok: false, error: "Missing required field: category" },
      { status: 400 },
    );
  }

  // Validate feedback if present: rating must be an integer 1–5.
  let feedback: RunRecord["feedback"];
  if (body.feedback != null) {
    const { rating, comment } = body.feedback as {
      rating?: unknown;
      comment?: unknown;
    };
    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid feedback.rating (expected integer 1–5)" },
        { status: 400 },
      );
    }
    feedback = {
      rating,
      comment: typeof comment === "string" ? comment : undefined,
    };
  }

  const record: RunRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    category: String(body.category),
    branchKey: body.branchKey,
    pathValue: body.pathValue,
    model: typeof body.model === "string" ? body.model : undefined,
    order: body.order,
    contact:
      body.contact && typeof body.contact === "object"
        ? body.contact
        : undefined,
    answers: Array.isArray(body.answers) ? (body.answers as StoredAnswer[]) : [],
    diagnoses: Array.isArray(body.diagnoses)
      ? (body.diagnoses as StoredDiagnosis[])
      : [],
    feedback,
    agentNotes:
      typeof body.agentNotes === "string" ? body.agentNotes : undefined,
  };

  // Render the PDF and stash it in Blob — best-effort, never blocks the save.
  try {
    const pdf = await buildRunPdf(buildPdfData(record), getLogoBuffer());
    if (blobConfigured()) record.pdfUrl = await uploadRunPdf(record.id, pdf);
  } catch (e) {
    console.error("[runs] pdf/blob failed:", e instanceof Error ? e.message : e);
  }

  try {
    await storage.saveRun(record);
  } catch (e) {
    console.error("[runs] save failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  // OUT OF SCOPE (#4): notifyTicketSystem(record) — see lib/storage/index.ts.

  return NextResponse.json({ ok: true, id: record.id, pdfUrl: record.pdfUrl });
}

// Health probe — confirms which stores are wired in this deployment (no data).
export function GET() {
  return NextResponse.json({
    postgres: postgresConfigured(),
    blob: blobConfigured(),
  });
}
