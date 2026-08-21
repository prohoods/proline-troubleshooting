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
    "This case could NOT be filed in Stopgap and needs handling by hand.",
    `Reason: ${input.reason}`,
    "",
    "The customer has been told their request was received — so it has to be,",
    "and a reply to this email goes straight to them.",
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
    <strong>Not filed in Stopgap — handle this one by hand.</strong><br>
    <span style="color:#6b7177;">${esc(input.reason)}</span>
  </p>
  <p style="margin:0 0 16px;color:#6b7177;">
    The customer has been told we received it. Replying to this email goes straight to them.
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
    subject: `[Not in Stopgap] ${heading} — ${input.name}`,
    text,
    html,
    attachments: input.images,
    // Reply goes to the customer, not to us: the point is that a person can
    // pick this up and answer without copying anything anywhere.
    replyTo: input.email,
  };
}
