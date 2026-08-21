import { NextResponse } from "next/server";

/**
 * Answers one question: does Stopgap accept our API key right now?
 *
 * Written after an afternoon of guessing. The only way to test the key was to
 * complete the whole questionnaire and see whether a case appeared, which is
 * slow, needs a browser, and leaves junk in the stats when it works.
 *
 * The trick is to send a request that is guaranteed to fail VALIDATION, so no
 * case is ever created, and read the status code:
 *
 *   401 → the key is refused. Nothing else we do will help.
 *   400 → the key was ACCEPTED and the empty case was rejected, as intended.
 *   anything else → reported verbatim, since it means something new.
 *
 *   GET /api/admin/support-check   with header  x-admin-token: <ADMIN_TOKEN>
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORT_URL =
  process.env.PROLINE_SUPPORT_API_URL ||
  "https://stopgap.azurewebsites.net/api/PublicSupport/SubmitCase";

export async function GET(request: Request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_TOKEN is not configured" },
      { status: 503 },
    );
  }
  if (request.headers.get("x-admin-token") !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const key = process.env.PROLINE_SUPPORT_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      keyAccepted: false,
      verdict: "No API key is configured for this deployment.",
    });
  }

  // Empty body: valid JSON, but missing every required field, so Stopgap has
  // to reject it on validation — after checking the key.
  let res: Response;
  try {
    res = await fetch(SUPPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: "{}",
      cache: "no-store",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      keyAccepted: false,
      verdict: `Couldn't reach Stopgap: ${e instanceof Error ? e.message : e}`,
    });
  }

  const detail = (await res.text().catch(() => "")).slice(0, 300).trim();

  // The key is the thing being tested, so a fingerprint rather than the value:
  // enough to tell two keys apart when comparing with whoever issued it.
  const fingerprint = `${key.length} chars, ends "${key.slice(-4)}"`;
  const clean = key === key.trim();

  if (res.status === 401) {
    return NextResponse.json({
      ok: false,
      status: 401,
      keyAccepted: false,
      key: fingerprint,
      keyHasNoStrayWhitespace: clean,
      verdict:
        "Stopgap is REFUSING this key. Cases cannot be filed until they fix it or issue a working key.",
    });
  }

  if (res.status === 400) {
    return NextResponse.json({
      ok: true,
      status: 400,
      keyAccepted: true,
      key: fingerprint,
      detail,
      verdict:
        "The key WORKS — Stopgap accepted it and rejected the empty test case, which is exactly right. Real submissions should go through.",
    });
  }

  return NextResponse.json({
    ok: false,
    status: res.status,
    keyAccepted: res.status !== 403,
    key: fingerprint,
    detail,
    verdict: `Unexpected reply ${res.status} — not the 401 (bad key) or 400 (good key) we know how to read.`,
  });
}
