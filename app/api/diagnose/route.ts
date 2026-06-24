import { NextResponse } from "next/server";
import { AiError, aiConfigured } from "@/lib/ai/openai";
import { type DiagnoseContext, generateDiagnosis } from "@/lib/ai/diagnose";
import type { RunAnswer } from "@/lib/storage/types";

// AI-generated tailored diagnosis for a completed run.
export const runtime = "nodejs";

// Best-effort in-memory rate limit (per serverless instance) — blunts abuse of
// the paid LLM call. Swap for Vercel KV / Upstash for a hard global cap.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  // Not configured yet (no key) — let the UI fall back to deterministic diagnoses.
  if (!aiConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  let ctx: DiagnoseContext;
  try {
    const body = (await request.json()) as Partial<DiagnoseContext>;
    if (typeof body.category !== "string" || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { ok: false, error: "bad_request" },
        { status: 400 },
      );
    }
    ctx = {
      category: body.category,
      branchKey: body.branchKey,
      pathValue: body.pathValue,
      answers: body.answers as RunAnswer[],
      order: body.order,
    };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    const diagnoses = await generateDiagnosis(ctx);
    if (diagnoses.length === 0) {
      return NextResponse.json(
        { ok: false, error: "empty" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, diagnoses });
  } catch (e) {
    const detail = e instanceof AiError ? e.code : "unknown";
    const message = e instanceof Error ? e.message : String(e);
    console.error("[diagnose] failed:", detail, message);
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
