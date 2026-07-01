import { NextResponse } from "next/server";
import type {
  SupportApiSuccess,
  SupportCaseRequest,
  SupportImage,
} from "@/lib/support/types";

// Server-side only: the X-Api-Key never reaches the browser. The client POSTs a
// multipart form here; we validate, base64-encode photos, and forward JSON to
// the Proline support API with the key attached.
export const runtime = "nodejs";

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

const fail = (error: string, status: number) =>
  NextResponse.json({ ok: false, error }, { status });

export async function POST(request: Request) {
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

  const body: SupportCaseRequest = {
    name,
    email,
    message,
    phone: str("phone") || undefined,
    subject: str("subject") || undefined,
    model: str("model") || undefined,
    serialNumber: str("serialNumber") || undefined,
    orderNumber: str("orderNumber") || undefined,
    troubleshootingSummary: str("troubleshootingSummary") || undefined,
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
      return NextResponse.json({
        ok: true,
        caseId: data.CaseId,
        attachedImages: data.AttachedImages ?? images.length,
      });
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
