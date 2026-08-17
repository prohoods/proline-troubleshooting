// Cloudflare Turnstile verification.
//
// Guards /api/support, which is the expensive endpoint: every call spends a
// Stopgap case, an OpenAI call, and a Resend email. Once the guide is linked
// publicly, that endpoint is a script away from running up a bill and flooding
// the support queue — the in-memory rate limit resets per serverless instance,
// so it barely counts as protection.

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Enforcement needs BOTH halves: the secret to verify with, and the site key
 * the browser needs to produce a token at all.
 *
 * Configuring only the secret is the dangerous case — the server demands a
 * token the widget can never generate, and every submission fails. That's
 * worse than no bot protection, so a half-configured setup is treated as off.
 */
export function turnstileConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
}

/**
 * True when the token is valid, or when Turnstile isn't configured.
 *
 * Fails OPEN on missing configuration so the guide keeps working before the
 * keys are set, and fails CLOSED on an invalid or missing token once it is.
 * A Cloudflare outage also fails closed: a brief inability to submit is a
 * better failure than an open door on a paid endpoint.
 */
export async function verifyTurnstile(
  token: string | null,
  ip: string | null,
): Promise<boolean> {
  if (!turnstileConfigured()) return true;
  const secret = process.env.TURNSTILE_SECRET_KEY as string;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      "error-codes"?: string[];
    } | null;

    if (!data?.success) {
      console.error(
        "[turnstile] rejected:",
        JSON.stringify(data?.["error-codes"] ?? "no response body"),
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error(
      "[turnstile] verification error:",
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}
