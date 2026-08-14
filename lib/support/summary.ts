import type { Diagnosis } from "@/lib/diagnoses/types";
import { NO_ORDER_VALUE } from "@/lib/flow/constants";
import type { AnswerRecord } from "@/lib/flow/engine";
import type { SpecMatch } from "@/lib/knowledge/specSheets";
import type { SelectedOrder } from "@/lib/shopify/types";
import type { Contact } from "@/lib/storage/types";

/**
 * Plain-text run summary for the Stopgap ticket.
 *
 * Shared by the agent console (where it's copied to the clipboard) and the
 * customer flow (where it's attached to the case the customer's submission
 * creates). The customer never sees this text — the POSSIBLE CAUSES section in
 * particular is written for the agent, and the server appends the AI
 * pre-diagnosis below it.
 */
export function buildSummary(
  order: SelectedOrder | null,
  contact: Contact | null,
  answers: AnswerRecord[],
  diagnoses: Diagnosis[],
  spec: SpecMatch | null,
  notes: string,
): string {
  const L: string[] = [
    "PROLINE TROUBLESHOOTING SUMMARY",
    new Date().toLocaleString(),
    "",
  ];

  if (order) {
    L.push(
      `Product: ${order.product.title}${order.product.sku ? ` (SKU ${order.product.sku})` : ""}`,
    );
    const bits = [order.orderName];
    if (order.processedAt)
      bits.push(`purchased ${new Date(order.processedAt).toLocaleDateString()}`);
    if (order.fulfillmentStatus) bits.push(order.fulfillmentStatus);
    L.push(`Order: ${bits.join(" · ")}`);
  } else if (spec) {
    L.push(`Product: ${spec.model} (entered manually)`);
  }
  if (spec?.pdfUrl) L.push(`Spec sheet: ${spec.pdfUrl}`);

  if (contact) {
    L.push("", "CONTACT", `Name: ${contact.name}`, `Email: ${contact.email}`);
    if (contact.phone?.trim()) L.push(`Phone: ${contact.phone}`);
  }

  L.push("", "ANSWERS");
  for (const a of answers) {
    if (a.questionId === "p_order_lookup" || a.value === NO_ORDER_VALUE) continue;
    const v = Array.isArray(a.value) ? a.value.join(", ") : a.value;
    L.push(`- ${a.prompt} -> ${v}`);
  }

  L.push("", "POSSIBLE CAUSES");
  diagnoses.forEach((d, i) => {
    L.push(`${i + 1}. ${d.title}`);
    L.push(`   ${d.summary}`);
    if (d.steps.length) L.push(`   Fix: ${d.steps.join(" | ")}`);
    if (d.escalation) L.push(`   Escalate: ${d.escalation}`);
  });

  if (notes.trim()) L.push("", "AGENT NOTES", notes.trim());

  return L.join("\n");
}

/**
 * The customer's own words for the ticket's required `message` field.
 *
 * The "describe the issue" questions are optional in the flow, so on the
 * customer path — where nobody types a description into a support form before
 * submitting — this can legitimately come back empty. Stopgap rejects an empty
 * message, so fall back to something that still tells the agent what they're
 * looking at.
 */
export function buildMessage(
  answers: AnswerRecord[],
  branchLabel: string | undefined,
  product: string | undefined,
): string {
  const described = answers
    .filter(
      (a) =>
        a.prompt.toLowerCase().includes("describe the issue") &&
        typeof a.value === "string" &&
        a.value.trim(),
    )
    .map((a) => (a.value as string).trim())
    .join("\n\n");
  if (described) return described;

  const extra = answers
    .filter(
      (a) =>
        a.prompt.toLowerCase().includes("additional information") &&
        typeof a.value === "string" &&
        a.value.trim(),
    )
    .map((a) => (a.value as string).trim())
    .join("\n\n");
  if (extra) return extra;

  const bits = [
    "Submitted from the online troubleshooting guide.",
    branchLabel ? `Issue type: ${branchLabel}.` : null,
    product ? `Product: ${product}.` : null,
    "The customer didn't add a written description — full answers are in the troubleshooting summary.",
  ].filter(Boolean);
  return bits.join(" ");
}
