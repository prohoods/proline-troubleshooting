import type { Diagnosis, Likelihood } from "@/lib/diagnoses/types";
import { findSpec } from "@/lib/knowledge/specSheets";
import type { SelectedOrder } from "@/lib/shopify/types";
import type { RunAnswer } from "@/lib/storage/types";
import { chatJSON } from "./openai";

export interface DiagnoseContext {
  category: string;
  branchKey?: string;
  pathValue?: string;
  answers: RunAnswer[];
  order?: SelectedOrder;
}

const SYSTEM = `You are the senior troubleshooting expert for Proline Range Hoods, a premium, direct-to-consumer maker of professional-grade kitchen and BBQ range hoods. A customer — or a Proline support agent helping them on a call — has just finished a guided troubleshooting questionnaire. Your job is to read what they told you and return the most likely cause(s) of their problem, each with a clear, safe fix.

VOICE — warm, authoritative, simple:
- Plain language, short sentences. No jargon, no corporate scripts.
- Speak directly to the customer ("you", "your hood"). Be reassuring and confident.
- Use the customer's own words where it helps them feel heard.

RULES:
- Ground every claim in the PRODUCT SPEC and the customer's answers below. Do NOT invent specifications, CFM numbers, part names, duct sizes, or features. If the spec wasn't provided or a detail isn't supported, give sound general range-hood guidance and don't state unconfirmed specifics as fact.
- Give 1–3 diagnoses, most likely first. Prefer fewer, higher-confidence causes over a long list.
- Each fix is a short, ordered list of safe, DIY-appropriate steps a homeowner can actually do.
- For anything electrical, start with a safety step (e.g. cut power at the breaker). Never instruct repairs that are unsafe or that clearly need a professional.
- Always include when to stop and contact Proline support — anything involving the motor, internal wiring, warranty, or a problem these steps don't resolve.

OUTPUT — respond with ONLY a JSON object, no prose outside it, in exactly this shape:
{
  "diagnoses": [
    {
      "title": "Short cause name",
      "likelihood": "most_likely" | "possible" | "less_likely",
      "summary": "1–2 plain-language sentences explaining the cause.",
      "steps": ["First do this.", "Then this."],
      "partsTools": ["optional list; omit or use [] if none"],
      "escalation": "When to stop and contact Proline support."
    }
  ]
}`;

interface RawDx {
  title?: unknown;
  likelihood?: unknown;
  summary?: unknown;
  steps?: unknown;
  partsTools?: unknown;
  escalation?: unknown;
}

const LIKELIHOODS: Likelihood[] = ["most_likely", "possible", "less_likely"];

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];

function normalize(raw: RawDx[]): Diagnosis[] {
  return raw
    .filter((d) => typeof d.title === "string" && typeof d.summary === "string")
    .slice(0, 3)
    .map((d, i) => {
      const likelihood = LIKELIHOODS.includes(d.likelihood as Likelihood)
        ? (d.likelihood as Likelihood)
        : i === 0
          ? "most_likely"
          : "possible";
      const partsTools = asStringArray(d.partsTools);
      return {
        id: `ai_${i}`,
        title: d.title as string,
        likelihood,
        summary: d.summary as string,
        steps: asStringArray(d.steps),
        partsTools: partsTools.length ? partsTools : undefined,
        escalation:
          typeof d.escalation === "string" ? d.escalation : undefined,
        placeholder: false,
      };
    });
}

function buildTranscript(answers: RunAnswer[]): string {
  return answers
    .map((a) => {
      const v = Array.isArray(a.value) ? a.value.join(", ") : a.value;
      return `- ${a.prompt}\n  → ${v || "(no answer)"}`;
    })
    .join("\n");
}

/**
 * Generate a tailored diagnosis from a completed run. Throws AiError if the LLM
 * is unconfigured or the call fails — the route maps that to a clean response so
 * the UI can fall back to the deterministic diagnoses.
 */
export async function generateDiagnosis(
  ctx: DiagnoseContext,
): Promise<Diagnosis[]> {
  const product = ctx.order?.product;
  const spec = findSpec([product?.title, product?.sku]);

  const userParts: string[] = [];
  if (spec) {
    userParts.push(`PRODUCT SPEC (${spec.model}):\n${spec.text}`);
  } else if (product) {
    userParts.push(
      `PRODUCT: ${product.title}${product.sku ? ` (SKU ${product.sku})` : ""} — no spec sheet on file; do not state model-specific numbers as fact.`,
    );
  } else {
    userParts.push("PRODUCT: not identified.");
  }

  userParts.push(`\nWHAT THE CUSTOMER TOLD US:\n${buildTranscript(ctx.answers)}`);
  userParts.push("\nReturn the diagnosis JSON now.");

  const result = await chatJSON<{ diagnoses?: RawDx[] }>([
    { role: "system", content: SYSTEM },
    { role: "user", content: userParts.join("\n") },
  ]);

  return normalize(Array.isArray(result.diagnoses) ? result.diagnoses : []);
}
