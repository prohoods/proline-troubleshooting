export type Likelihood = "most_likely" | "possible" | "less_likely";

export interface Diagnosis {
  id: string;
  title: string;
  likelihood: Likelihood;
  /** One- or two-sentence plain-language explanation. */
  summary: string;
  /** Ordered fix steps. */
  steps: string[];
  partsTools?: string[];
  /** When to stop and contact Proline support. */
  escalation?: string;
  /** True until real Proline content replaces the scaffolded copy. */
  placeholder?: boolean;
}

export const LIKELIHOOD_LABEL: Record<Likelihood, string> = {
  most_likely: "Most likely",
  possible: "Possible",
  less_likely: "Less likely",
};
