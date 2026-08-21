import { NextResponse } from "next/server";
import { type DiagnoseContext, generateDiagnosis } from "@/lib/ai/diagnose";
import { aiConfigured } from "@/lib/ai/openai";
import { buildCaseConfirmation } from "@/lib/email/caseConfirmation";
import { emailConfigured, sendEmail } from "@/lib/email/resend";
import { buildCaseHandover } from "@/lib/email/caseHandover";
import { alertSlack } from "@/lib/alerts/slack";
import { corsPreflight, withCors } from "@/lib/cors";
import { verifyTurnstile } from "@/lib/security/turnstile";
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

  // ---- Bot check ------------------------------------------------------------
  // Before any paid work. Everything downstream of here — the Stopgap case, the
  // AI pre-diagnosis, the confirmation email — costs money per call.
  if (!(await verifyTurnstile(str("turnstileToken") || null, ip))) {
    return fail(
      "We couldn't verify that request came from a browser. Please reload the page and try again.",
      403,
    );
  }

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

  // ---- Debug capture --------------------------------------------------------
  // Set SUPPORT_DEBUG_LOG=1 to log the exact JSON forwarded upstream, so a
  // created case can be matched to the precise request that produced it.
  // Image bytes are replaced with metadata — the payload is otherwise verbatim.
  // Off by default: this body carries the customer's name, email, and phone,
  // which shouldn't sit in runtime logs outside an active investigation.
  const debugLog = process.env.SUPPORT_DEBUG_LOG === "1";
  if (debugLog) {
    const redacted = {
      ...body,
      images: body.images?.map((i) => ({
        fileName: i.fileName,
        contentType: i.contentType,
        base64Bytes: i.base64.length,
        base64: `<${i.base64.length} chars omitted>`,
      })),
    };
    console.log(
      "[support][debug] REQUEST →",
      SUPPORT_URL,
      JSON.stringify(
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": "<redacted>",
          },
          body: redacted,
        },
        null,
        2,
      ),
    );
  }

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
    const why = e instanceof Error ? e.message : String(e);
    console.error("[support] network error:", why);
    if (await handover(body, images, `Couldn't reach Stopgap — ${why}`)) {
      return withCors(
        NextResponse.json({
          ok: true,
          handedOver: true,
          attachedImages: images.length,
        }),
        request,
      );
    }
    return fail("Couldn't reach the support system. Please try again.", 502);
  }

  if (res.status === 200) {
    const data = (await res
      .json()
      .catch(() => null)) as SupportApiSuccess | null;
    if (data?.Success && typeof data.CaseId === "number") {
      // Acknowledgement to the customer. Best-effort, and awaited only so the
      // serverless function isn't torn down mid-flight: the case already
      // exists and the customer has already been told it worked, so an email
      // failure must never become an error they see.
      if (emailConfigured()) {
        const mail = buildCaseConfirmation({
          name: body.name,
          caseId: data.CaseId,
          model: body.model,
          attachedImages: data.AttachedImages ?? images.length,
        });
        const id = await sendEmail({ to: body.email, ...mail });
        if (!id) {
          console.error(
            `[support] confirmation email failed for case ${data.CaseId}`,
          );
        }
      }

      // Correlates the logged request above with the case it created.
      if (debugLog) {
        console.log(
          `[support][debug] RESPONSE ← CaseId=${data.CaseId} AttachedImages=${data.AttachedImages} name=${JSON.stringify(body.name)} email=${JSON.stringify(body.email)} orderNumber=${JSON.stringify(body.orderNumber ?? null)}`,
        );
      }
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

  // 401 (our key), 403 (origin), 500, anything else → log detail, then try to
  // rescue the case rather than lose it.
  const detail = (await res.text().catch(() => "")).slice(0, 300);
  console.error(`[support] upstream ${res.status}: ${detail}`);

  const rescued = await handover(
    body,
    images,
    `Stopgap answered ${res.status}${detail ? ` — ${detail}` : ""}`,
  );
  if (rescued) {
    return withCors(
      NextResponse.json({
        ok: true,
        handedOver: true,
        attachedImages: images.length,
      }),
      request,
    );
  }
  return fail("Couldn't submit the case. Please try again.", 502);
}

/**
 * Last resort when Stopgap won't take a case: email it to the team instead.
 *
 * Returns true only if the email actually went, because that is the whole
 * question — if it did, a person has the case and telling the customer it was
 * received is true. If it didn't, nothing has the case and they must see the
 * error, however unhelpful, rather than be told a comforting lie.
 */
async function handover(
  body: SupportCaseRequest,
  images: SupportImage[],
  reason: string,
): Promise<boolean> {
  const to = process.env.SUPPORT_FALLBACK_EMAIL?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim();
  if (!emailConfigured() || !to) {
    console.error("[support] no handover inbox configured — case lost");
    return false;
  }

  const mail = buildCaseHandover({
    name: body.name,
    email: body.email,
    phone: body.phone,
    subject: body.subject,
    model: body.model,
    orderNumber: body.orderNumber,
    summary: body.troubleshootingSummary,
    message: body.message,
    reason,
    images: images.map((i, n) => ({
      filename: i.fileName || `photo-${n + 1}.jpg`,
      content: i.base64,
    })),
  });

  const id = await sendEmail({ to, ...mail });
  if (!id) {
    console.error("[support] handover email failed — case lost");
    return false;
  }

  console.error(`[support] handed over by email (${reason})`);
  await alertSlack(
    `:rotating_light: Troubleshooting guide can't file cases — ${reason}. ` +
      `Case from ${body.name} <${body.email}> was emailed to ${to} instead. ` +
      `Customers are still being served, but every case needs handling by hand until this is fixed.`,
  );
  return true;
}

// Health probe — whether the support key is wired (no data, no upstream call).
export function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.PROLINE_SUPPORT_API_KEY),
  });
}
