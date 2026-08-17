// Transactional email via Resend's REST API.
//
// Called with fetch rather than the SDK to avoid another dependency for one
// endpoint. Server-side only — RESEND_API_KEY must never reach the browser.

const ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends one email. Returns the provider's id on success, or null on any
 * failure — callers treat email as best-effort so a provider outage can never
 * fail an operation the customer has already been told succeeded.
 */
export async function sendEmail(input: SendEmailInput): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return null;

  // Replies to a no-reply address vanish, and on a support email some people
  // will reply anyway. Point them at a monitored inbox.
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.error(`[email] resend ${res.status}: ${detail}`);
      return null;
    }
    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return data?.id ?? null;
  } catch (e) {
    console.error("[email] network error:", e instanceof Error ? e.message : e);
    return null;
  }
}
