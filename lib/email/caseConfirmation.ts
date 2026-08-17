import { findSpec } from "@/lib/knowledge/specSheets";

/**
 * The acknowledgement a customer receives once their case exists.
 *
 * Deliberately short. It confirms the case number, sets the response
 * expectation, and hands over the documents for their model — everything else
 * is the agent's reply to write. It does NOT restate their answers back at
 * them, and it never includes the AI pre-diagnosis: that's written for an
 * agent, and a customer acting on it unsupervised is exactly what the flow
 * redesign was meant to prevent.
 */
export interface CaseConfirmationInput {
  name: string;
  caseId: number;
  /** Model as submitted, used to look up the install guide and spec sheet. */
  model?: string;
  attachedImages: number;
}

const BRAND = "Proline Range Hoods";
const SUPPORT_URL = "https://prolinerangehoods.com/pages/resources";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function buildCaseConfirmation(input: CaseConfirmationInput): {
  subject: string;
  text: string;
  html: string;
} {
  const spec = input.model ? findSpec([input.model]) : null;
  const firstName = input.name.trim().split(/\s+/)[0] || "there";
  const subject = `We've got your request — case #${input.caseId}`;

  const photoLine =
    input.attachedImages > 0
      ? `We received your ${input.attachedImages} photo${input.attachedImages > 1 ? "s" : ""} along with your answers.`
      : "We received your answers.";

  const docs: Array<[string, string]> = [];
  if (spec?.installGuideUrl)
    docs.push([`${spec.model} install guide (PDF)`, spec.installGuideUrl]);
  if (spec?.pdfUrl) docs.push([`${spec.model} spec sheet (PDF)`, spec.pdfUrl]);

  const text = [
    `Hi ${firstName},`,
    "",
    `Thanks for reaching out. Your request is with our support team as case #${input.caseId}.`,
    "",
    `${photoLine} A Proline specialist will review everything and email you within one to two business days — you won't need to repeat any of it.`,
    "",
    ...(docs.length
      ? [
          "In the meantime, these may help:",
          ...docs.map(([label, url]) => `- ${label}: ${url}`),
          "",
        ]
      : []),
    "A safety note while you wait: if the hood is behaving unpredictably, leave it switched off at the breaker. Please don't open the motor housing or touch internal wiring — that's work for a licensed professional.",
    "",
    `— ${BRAND}`,
    SUPPORT_URL,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f7f9;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2b2b2b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dae2e9;border-radius:16px;padding:28px;">
    <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#28a5de;">Request received</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Thanks, ${esc(firstName)} — we've got it.</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Your request is with our support team as <strong>case #${input.caseId}</strong>.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${esc(photoLine)} A Proline specialist will review everything and email you <strong>within one to two business days</strong> — you won't need to repeat any of it.</p>
    ${
      docs.length
        ? `<div style="margin:0 0 16px;padding:16px;background:#f4f7f9;border:1px solid #dae2e9;border-radius:12px;">
      <p style="margin:0 0 10px;font-size:14px;font-weight:700;">In the meantime, these may help</p>
      ${docs
        .map(
          ([label, url]) =>
            `<p style="margin:0 0 6px;font-size:14px;"><a href="${esc(url)}" style="color:#1b86bc;">${esc(label)}</a></p>`,
        )
        .join("")}
    </div>`
        : ""
    }
    <div style="margin:0 0 16px;padding:14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;font-size:14px;line-height:1.6;color:#78350f;">
      <strong>While you wait:</strong> if the hood is behaving unpredictably, leave it switched off at the breaker. Please don't open the motor housing or touch internal wiring — that's work for a licensed professional.
    </div>
    <p style="margin:0;font-size:13px;color:#6b7177;">— ${BRAND} · <a href="${SUPPORT_URL}" style="color:#1b86bc;">Support centre</a></p>
  </div>
</body></html>`;

  return { subject, text, html };
}
