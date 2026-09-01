import type { EmailAttachment } from "./resend";

/**
 * The email your team gets when Stopgap won't take a case.
 *
 * This exists because of a real incident: Stopgap's API key was rotated,
 * every submission came back 401, and the guide kept nothing — six attempts
 * from one customer produced no ticket, no saved answers, and no alert. The
 * first anyone knew was when the customer emailed to say it hadn't worked.
 *
 * So a refusal now produces a working support case in a different form: the
 * whole thing as an email, with the photos attached, addressed so that hitting
 * reply goes to the customer. The case is handled by a person either way, which
 * is what the customer was promised.
 */

export interface HandoverInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  model?: string;
  orderNumber?: string;
  /** Everything the customer answered, plus any video links and AI notes. */
  summary?: string;
  message: string;
  /** Why Stopgap wouldn't take it — for whoever has to chase the outage. */
  reason: string;
  images: EmailAttachment[];
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function buildCaseHandover(input: HandoverInput): {
  subject: string;
  text: string;
  html: string;
  attachments: EmailAttachment[];
  replyTo: string;
  fromName: string;
} {
  const heading = input.model
    ? `Troubleshooting request — ${input.model}`
    : "Troubleshooting request";

  const facts: [string, string | undefined][] = [
    ["Name", input.name],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Model", input.model],
    ["Order", input.orderNumber],
  ];

  const lines = [
    "The guide couldn't file this through the Stopgap API, so it came in by",
    "email instead. It still needs a person — nothing has replied to the",
    "customer yet.",
    `Reason: ${input.reason}`,
    "",
    "Reply to the customer's address below, not to the sender of this message.",
    "",
    ...facts.filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${v}`),
    "",
    input.message,
  ];

  if (input.summary?.trim()) {
    lines.push("", "----------------------------------------", input.summary.trim());
  }
  if (input.images.length) {
    lines.push(
      "",
      `${input.images.length} photo${input.images.length === 1 ? "" : "s"} attached.`,
    );
  }

  const text = lines.join("\n");

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;color:#1c1f22;line-height:1.55">
  <p style="margin:0 0 12px;padding:10px 12px;background:#fdece9;border-left:3px solid #d0342c;">
    <strong>Came in by email, not through the API — still needs a person.</strong><br>
    <span style="color:#6b7177;">${esc(input.reason)}</span>
  </p>
  <p style="margin:0 0 16px;color:#6b7177;">
    The customer has been told we received it. Reply to their address below — not to the sender of this message.
  </p>
  <table style="border-collapse:collapse;margin:0 0 16px;">
    ${facts
      .filter(([, v]) => v?.trim())
      .map(
        ([k, v]) =>
          `<tr><td style="padding:3px 16px 3px 0;color:#6b7177;">${k}</td><td style="padding:3px 0;"><strong>${esc(v as string)}</strong></td></tr>`,
      )
      .join("")}
  </table>
  <pre style="white-space:pre-wrap;font-family:inherit;margin:0;padding:12px;background:#f5f7f8;border-radius:8px;">${esc(
    input.summary?.trim() || input.message,
  )}</pre>
  ${
    input.images.length
      ? `<p style="margin:12px 0 0;color:#6b7177;">${input.images.length} photo${input.images.length === 1 ? "" : "s"} attached.</p>`
      : ""
  }
</div>`;

  return {
    // Not "[Not in Stopgap]": support@ feeds Stopgap, so these DO become cases,
    // just through the inbox rather than the API. Saying otherwise sent people
    // looking for a problem that wasn't there.
    subject: `[Filed by email] ${heading} — ${input.name}`,
    text,
    html,
    // Stopgap raises the case against the From line, so send under the
    // customer's name — otherwise every one of these is filed against us.
    fromName: `${input.name} via the troubleshooting guide`,
    attachments: input.images,
    // Reply goes to the customer, not to us: the point is that a person can
    // pick this up and answer without copying anything anywhere.
    replyTo: input.email,
  };
}
