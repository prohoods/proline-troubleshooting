// Cloudflare Turnstile verification.
//
// Guards /api/support, which is the expensive endpoint: every call spends a
// Stopgap case, an OpenAI call, and a Resend email. Once the guide is linked
// publicly, that endpoint is a script away from running up a bill and flooding
// the support queue — the in-memory rate limit resets per serverless instance,
// so it barely counts as protection.

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
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
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
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
