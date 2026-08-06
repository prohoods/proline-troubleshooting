import { NextResponse } from "next/server";
import { type DiagnoseContext, generateDiagnosis } from "@/lib/ai/diagnose";
import { aiConfigured } from "@/lib/ai/openai";
import { corsPreflight, withCors } from "@/lib/cors";
import type { Diagnosis } from "@/lib/diagnoses/types";
import type { RunAnswer } from "@/lib/storage/types";
import type {
  SupportApiSuccess,
  SupportCaseRequest,
  SupportImage,
} from "@/lib/support/types";

// Server-side only: the X-Api-Key never reaches the browser. The client POSTs a
// multipart form here; we validate, base64-encode photos, and forward JSON to
// the Proline support API with the key attached.
//
// Customer-mode submissions also carry a `runContext` field (the completed
// run, same shape as the /api/diagnose body). The customer never sees an AI
// answer — we run the AI pre-diagnosis here, at ticket time, and append it to
// the troubleshooting summary so it lands in front of the agent in Stopgap.
export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORT_URL =
  process.env.PROLINE_SUPPORT_API_URL ||
  "https://stopgap.azurewebsites.net/api/PublicSupport/SubmitCase";

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/bmp",
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort per-instance rate limit for the paid upstream call.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
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

// Bound to the request so cross-origin (storefront) callers can read the error.
const failFor = (request: Request) => (error: string, status: number) =>
  withCors(NextResponse.json({ ok: false, error }, { status }), request);

// ---- AI pre-diagnosis (agent-facing, best-effort) ---------------------------
// Never blocks the ticket: any parse/AI/timeout failure just means the case is
// submitted without the AI section.
const AI_TIMEOUT_MS = 25_000;

function parseRunContext(raw: string): DiagnoseContext | null {
  try {
    const body = JSON.parse(raw) as Partial<DiagnoseContext>;
    if (typeof body.category !== "string" || !Array.isArray(body.answers)) {
      return null;
    }
    return {
      category: body.category,
      branchKey: typeof body.branchKey === "string" ? body.branchKey : undefined,
      pathValue: typeof body.pathValue === "string" ? body.pathValue : undefined,
      answers: body.answers as RunAnswer[],
      order: body.order,
      modelText: typeof body.modelText === "string" ? body.modelText : undefined,
    };
  } catch {
    return null;
  }
}

function formatAiSection(diagnoses: Diagnosis[]): string {
  const L: string[] = [
    "",
    "==============================================",
    "AI PRE-DIAGNOSIS — INTERNAL, FOR THE AGENT",
    "(Generated when the customer submitted this case.",
    "The customer saw scripted guidance only, not this.)",
    "==============================================",
  ];
  diagnoses.forEach((d, i) => {
    L.push(`${i + 1}. ${d.title} [${d.likelihood.replace(/_/g, " ")}]`);
    L.push(`   ${d.summary}`);
    if (d.steps.length) L.push(`   Fix: ${d.steps.join(" | ")}`);
    if (d.partsTools?.length)
      L.push(`   Parts/tools: ${d.partsTools.join(", ")}`);
    if (d.escalation) L.push(`   Escalate: ${d.escalation}`);
  });
  return L.join("\n");
}

async function aiSectionFor(raw: string): Promise<string> {
  if (!aiConfigured()) return "";
  const ctx = parseRunContext(raw);
  if (!ctx) return "";
  try {
    const diagnoses = await Promise.race([
      generateDiagnosis(ctx),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ai_timeout")), AI_TIMEOUT_MS),
      ),
    ]);
    return diagnoses.length ? formatAiSection(diagnoses) : "";
  } catch (e) {
    console.error(
      "[support] AI pre-diagnosis skipped:",
      e instanceof Error ? e.message : e,
    );
    return "";
  }
}

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  const fail = failFor(request);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return fail("Too many attempts — please wait a minute and try again.", 429);
  }

  const key = process.env.PROLINE_SUPPORT_API_KEY;
  if (!key) {
    return fail(
      "Support case submission isn't configured yet. Please contact an admin.",
      503,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Invalid form submission.", 400);
  }

  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  // ---- Required-field validation (mirror the API contract before forwarding) ---
  const name = str("name");
  const email = str("email");
  const message = str("message");
  if (!name) return fail("Please enter a name.", 400);
  if (!email || !EMAIL_RE.test(email))
    return fail("Please enter a valid email address.", 400);
  if (!message) return fail("Please describe the problem.", 400);

  // ---- Photos: enforce limits, base64-encode server-side --------------------
  const files = form
    .getAll("images")
    .filter((f): f is File => f instanceof File);
  const images: SupportImage[] = [];
  for (const f of files) {
    if (images.length >= MAX_IMAGES) break;
    const contentType = f.type || "";
    if (!IMAGE_TYPES.has(contentType)) continue; // non-image → ignore
    if (f.size === 0 || f.size > MAX_IMAGE_BYTES) continue; // oversized → ignore
    const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
    images.push({ base64, fileName: f.name || undefined, contentType });
  }

  // ---- Customer runs: attach the agent-facing AI pre-diagnosis --------------
  const runContext = str("runContext");
  let summary = str("troubleshootingSummary");
  if (runContext) {
    const aiSection = await aiSectionFor(runContext);
    if (aiSection) summary = `${summary}\n${aiSection}`.trim();
  }

  const body: SupportCaseRequest = {
    name,
    email,
    message,
    phone: str("phone") || undefined,
    subject: str("subject") || undefined,
    model: str("model") || undefined,
    serialNumber: str("serialNumber") || undefined,
    orderNumber: str("orderNumber") || undefined,
    troubleshootingSummary: summary || undefined,
    images: images.length ? images : undefined,
  };

  // ---- Forward to the Proline support API with the key ----------------------
  let res: Response;
  try {
    res = await fetch(SUPPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[support] network error:", e instanceof Error ? e.message : e);
    return fail("Couldn't reach the support system. Please try again.", 502);
  }

  if (res.status === 200) {
    const data = (await res
      .json()
      .catch(() => null)) as SupportApiSuccess | null;
    if (data?.Success && typeof data.CaseId === "number") {
      return withCors(
        NextResponse.json({
          ok: true,
          caseId: data.CaseId,
          attachedImages: data.AttachedImages ?? images.length,
        }),
        request,
      );
    }
    console.error("[support] unexpected 200 body:", JSON.stringify(data));
    return fail("The support system returned an unexpected response.", 502);
  }

  if (res.status === 400) {
    // 400 body is a plain-text validation message — surface it to the agent.
    const msg = (await res.text().catch(() => "")).trim();
    return fail(msg || "The support system rejected the request.", 400);
  }

  // 401 (our key), 403 (origin), 500, anything else → log detail, generic to user.
  const detail = (await res.text().catch(() => "")).slice(0, 300);
  console.error(`[support] upstream ${res.status}: ${detail}`);
  return fail("Couldn't submit the case. Please try again.", 502);
}

// Health probe — whether the support key is wired (no data, no upstream call).
export function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.PROLINE_SUPPORT_API_KEY),
  });
}
