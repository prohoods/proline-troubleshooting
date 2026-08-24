import { after, NextResponse } from "next/server";
import { type DiagnoseContext, generateDiagnosis } from "@/lib/ai/diagnose";
import {
  brainConfigured,
  diagnoseWithBrain,
  formatBrainSection,
} from "@/lib/ai/prolineBrain";
import { aiConfigured } from "@/lib/ai/openai";
import { buildCaseConfirmation } from "@/lib/email/caseConfirmation";
import { emailConfigured, sendEmail } from "@/lib/email/resend";
import { buildCaseHandover } from "@/lib/email/caseHandover";
import { alertSlack } from "@/lib/alerts/slack";
import { corsPreflight, withCors } from "@/lib/cors";
import {
  turnstileConfigured,
  verifyTurnstile,
} from "@/lib/security/turnstile";
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
/**
 * How long the CUSTOMER waits for a pre-diagnosis before we file without one.
 *
 * They are sitting on the last screen watching a spinner for something they
 * will never see — it's written for the agent. Proline AI searches the vault
 * and routinely takes longer than this; when it does, the case is filed
 * immediately and the analysis follows by email.
 *
 * Zero by default, i.e. don't wait at all. Proline AI searches the vault and
 * takes far longer than anyone should be held on a confirmation screen, so an
 * inline attempt was three seconds spent losing a race. The analysis is
 * finished afterwards and emailed against the case number instead.
 *
 * Raise INLINE_AI_MS if it becomes fast enough to be worth catching — the
 * result then goes into the case body as it originally did.
 */
const INLINE_AI_MS = Number(process.env.INLINE_AI_MS ?? 0);

/** The ceiling once nobody is waiting — bounded by this route's maxDuration. */
const BACKGROUND_AI_MS = 45_000;

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

/**
 * The pre-diagnosis that rides along in the ticket, for the agent only.
 *
 * Proline AI first: it searches the live Brain, so it knows everything the
 * team knows today. The local model is the fallback — faster, but working from
 * a summary of the vault frozen in July.
 *
 * Both are wrapped in the same time budget and both may return nothing. The
 * case is what matters; a missing pre-diagnosis costs an agent a few minutes,
 * a delayed case costs the customer their submission.
 */
async function aiSectionFor(
  raw: string,
  budgetMs: number,
): Promise<string> {
  const ctx = parseRunContext(raw);
  if (!ctx) return "";

  // One deadline for both engines, not one each. Giving the fallback its own
  // budget doubles the wait in exactly the case where the customer is already
  // waiting too long — which is what happened the first time this shipped.
  const deadline = Date.now() + budgetMs;
  const remaining = () => deadline - Date.now();
  // Below this there isn't time for a round trip; don't spend it finding out.
  const TOO_LATE_MS = 1_500;

  if (brainConfigured()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining());
    try {
      const result = await diagnoseWithBrain(ctx, controller.signal);
      if (result) {
        // Logged on the way through, because the alternative is proving a
        // negative: without this, "Proline AI worked" and "Proline AI was
        // never called" look identical in the logs.
        console.log(
          `[support] Proline AI diagnosis used — ${result.causes.length} cause(s), ` +
            `${result.consulted?.length ?? 0} Brain note(s): ` +
            `${(result.consulted ?? []).slice(0, 5).join("; ") || "none cited"}`,
        );
        return formatBrainSection(result);
      }
      console.error("[support] Proline AI returned no causes — falling back");
    } catch (e) {
      console.error(
        "[support] Proline AI unavailable, falling back:",
        e instanceof Error ? e.message : e,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  if (!aiConfigured()) return "";
  if (remaining() < TOO_LATE_MS) {
    console.error("[support] no time left for the fallback diagnosis");
    return "";
  }
  try {
    const left = remaining();
    const diagnoses = await Promise.race([
      generateDiagnosis(ctx),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ai_timeout")), left),
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
  // Where the customer's wait actually goes. Added after a report of a
  // 25-second submit that couldn't be attributed to anything: the guesses were
  // the AI, the bot check, Stopgap and the email, and no way to tell them apart.
  const t0 = Date.now();
  const marks: string[] = [];
  const mark = (label: string, since: number) =>
    marks.push(`${label}=${Date.now() - since}ms`);

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
  mark("botcheck", t0);
  const tImages = Date.now();

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
  mark("images", tImages);
  const tAi = Date.now();

  const runContext = str("runContext");
  let summary = str("troubleshootingSummary");
  // Set when the pre-diagnosis didn't make the customer's time budget, so it
  // can be finished and emailed once they're off the hook.
  let pendingDiagnosis = "";
  if (runContext) {
    const aiSection =
      INLINE_AI_MS > 0 ? await aiSectionFor(runContext, INLINE_AI_MS) : "";
    if (aiSection) summary = `${summary}\n${aiSection}`.trim();
    else pendingDiagnosis = runContext;
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

  mark("diagnosis", tAi);
  const tStopgap = Date.now();

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

  mark("stopgap", tStopgap);

  if (res.status === 200) {
    const data = (await res
      .json()
      .catch(() => null)) as SupportApiSuccess | null;
    if (data?.Success && typeof data.CaseId === "number") {
      // The analysis outran the customer's patience, so finish it now that
      // they've been sent on their way and email it to whoever picks the case
      // up. after() runs once the response has gone out.
      if (pendingDiagnosis) {
        const caseId = data.CaseId;
        const who = body.name;
        const finish = async () => {
          const section = await aiSectionFor(pendingDiagnosis, BACKGROUND_AI_MS);
          if (!section) {
            console.error(`[support] no pre-diagnosis for case #${caseId}`);
            return;
          }
          const to =
            process.env.SUPPORT_FALLBACK_EMAIL?.trim() ||
            process.env.EMAIL_REPLY_TO?.trim();
          if (!emailConfigured() || !to) return;
          const sent = await sendEmail({
            to,
            subject: `Pre-diagnosis for case #${caseId} — ${who}`,
            text: `This analysis took longer than the customer was willing to wait, so their case was filed without it.\n\nIt belongs to case #${caseId}.\n${section}`,
            html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.55;color:#1c1f22"><p style="margin:0 0 12px">Analysis for <strong>case #${caseId}</strong> (${who}). It took longer than the customer was willing to wait, so the case was filed without it.</p><pre style="white-space:pre-wrap;font-family:inherit;margin:0;padding:12px;background:#f5f7f8;border-radius:8px">${section
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</pre></div>`,
          });
          console.log(
            `[support] pre-diagnosis for case #${caseId} ${sent ? "emailed" : "FAILED to send"}`,
          );
        };

        // The case already exists and the customer is about to be told so.
        // Nothing here is allowed to turn that into an error they see.
        try {
          after(finish);
        } catch (e) {
          console.error(
            `[support] couldn't schedule the pre-diagnosis for case #${caseId}:`,
            e instanceof Error ? e.message : e,
          );
        }
      }

      // Acknowledgement to the customer. This used to be awaited purely to stop
      // the serverless function being torn down mid-send, which meant the
      // customer sat waiting on their own receipt. after() is the right tool:
      // it runs once the response has gone out, without the teardown risk.
      if (emailConfigured()) {
        const mail = buildCaseConfirmation({
          name: body.name,
          caseId: data.CaseId,
          model: body.model,
          attachedImages: data.AttachedImages ?? images.length,
        });
        const to = body.email;
        const caseId = data.CaseId;
        try {
          after(async () => {
            const id = await sendEmail({ to, ...mail });
            if (!id) {
              console.error(
                `[support] confirmation email failed for case ${caseId}`,
              );
            }
          });
        } catch {
          // No request scope to schedule in — send it inline rather than
          // silently skip the customer's receipt.
          await sendEmail({ to, ...mail });
        }
      }

      console.log(
        `[support] case #${data.CaseId} filed in ${Date.now() - t0}ms (${marks.join(" ")})`,
      );

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

  // The customer is told their request was received, so they get the same
  // acknowledgement they would have had — minus a case number, because there
  // isn't one. Best-effort: the case is already safely with the team.
  const ack = buildCaseConfirmation({
    name: body.name,
    caseId: null,
    model: body.model,
    attachedImages: images.length,
  });
  await sendEmail({ to: body.email, ...ack });
  await alertSlack(
    `:rotating_light: Troubleshooting guide can't file cases — ${reason}. ` +
      `Case from ${body.name} <${body.email}> was emailed to ${to} instead. ` +
      `Customers are still being served, but every case needs handling by hand until this is fixed.`,
  );
  return true;
}

// Health probe — whether the support key is wired (no data, no upstream call).
//
// `botCheck` matters to the browser: enforcement needs the secret, which only
// the server can see, while the widget only knows about the site key. Leave
// the site key set after removing the secret and the customer waits for a pass
// nobody will ever check — which is exactly what happened.
export function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.PROLINE_SUPPORT_API_KEY),
    botCheck: turnstileConfigured(),
  });
}
