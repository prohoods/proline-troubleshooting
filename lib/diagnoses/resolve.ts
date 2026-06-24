import { getActiveBranch, getActivePath } from "@/lib/flow/engine";
import type { CategoryFlow } from "@/lib/flow/types";
import type { Answers, AnswerValue } from "@/lib/types";
import { DIAGNOSIS_CONTENT } from "./content";
import type { Diagnosis } from "./types";

export interface DiagnosisResult {
  branchKey?: string;
  pathValue?: string;
  diagnoses: Diagnosis[];
}

const asArray = (v: AnswerValue | undefined): string[] =>
  Array.isArray(v) ? v : typeof v === "string" ? [v] : [];

/**
 * Map a completed run to one or more likely diagnoses.
 *
 * v1 is intentionally simple: pick the branch's diagnoses, with ONE illustrative
 * rule showing how specific answers can refine likelihood. Replace the rule block
 * with real Proline logic (or a richer rules/scoring table) when content lands.
 */
export function resolveDiagnoses(
  flow: CategoryFlow,
  answers: Answers,
): DiagnosisResult {
  const branch = getActiveBranch(flow, answers);
  if (!branch) return { diagnoses: DIAGNOSIS_CONTENT._fallback };

  let diagnoses = [...(DIAGNOSIS_CONTENT[branch.key] ?? DIAGNOSIS_CONTENT._fallback)];
  const pathValue =
    branch.kind === "split" ? getActivePath(branch, answers)?.value : undefined;

  // ---- Example rule (replace with real Proline logic) ---------------------
  // Promote "duct restriction" to the most-likely diagnosis when the duct run is
  // long or has many elbows. Indoors/Outdoors use different question ids.
  if (branch.key === "hood_performance") {
    // Read only the active path's duct questions — indoors and outdoors use
    // different ids, so this prevents a stale answer from an abandoned path
    // from leaking into the result.
    const lengthId = pathValue === "outdoors" ? "hp_out_q19" : "hp_in_q18";
    const elbowsId = pathValue === "outdoors" ? "hp_out_q20" : "hp_in_q19";
    const length = asArray(answers[lengthId]);
    const elbows = asArray(answers[elbowsId]);
    const restricted =
      elbows.some((e) => e === "3" || e === "4") ||
      length.some((l) => l === "30_40_feet" || l === "more_than_40_feet");

    if (restricted) {
      diagnoses = diagnoses
        .map((d) =>
          d.id === "hp_duct" ? { ...d, likelihood: "most_likely" as const } : d,
        )
        .sort((a, b) => (a.id === "hp_duct" ? -1 : b.id === "hp_duct" ? 1 : 0));
    }
  }

  return { branchKey: branch.key, pathValue, diagnoses };
}
