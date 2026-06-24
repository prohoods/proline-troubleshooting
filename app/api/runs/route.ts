import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import type { RunRecord } from "@/lib/storage/types";

// Single ingress point for completed runs (selections + diagnosis + feedback).
// Persistence is delegated to the swappable storage module.
export const runtime = "nodejs";

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
    answers: Array.isArray(body.answers) ? body.answers : [],
    diagnoses: Array.isArray(body.diagnoses) ? body.diagnoses : [],
    feedback,
  };

  await storage.saveRun(record);

  // OUT OF SCOPE (v1): notifyTicketSystem(record) — see lib/storage/index.ts.

  return NextResponse.json({ ok: true, id: record.id });
}
