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

/** Mark one diagnosis most-likely and move it to the front. */
const promote = (diagnoses: Diagnosis[], id: string): Diagnosis[] =>
  diagnoses
    .map((d) => (d.id === id ? { ...d, likelihood: "most_likely" as const } : d))
    .sort((a, b) => (a.id === id ? -1 : b.id === id ? 1 : 0));

/**
 * Map a completed run to one or more likely diagnoses.
 *
 * Baseline order comes from DIAGNOSIS_CONTENT; the rules below re-rank using
 * specific answers. Each rule encodes a pattern support actually uses to
 * triage (see the vault's KB - Troubleshooting & Care and the 2026-07 support
 * email mining): the filter test for rattles, the window test for make-up
 * air, "all lights died at once" for the driver, etc.
 */
export function resolveDiagnoses(
  flow: CategoryFlow,
  answers: Answers,
): DiagnosisResult {
  const branch = getActiveBranch(flow, answers);
  if (!branch) return { diagnoses: DIAGNOSIS_CONTENT._fallback };

  // No entry means no vetted causes for that branch — currently every ranges
  // branch. Falling back to the hood set would staple hood diagnoses onto a
  // range case, which is worse for the agent than showing none.
  let diagnoses = [...(DIAGNOSIS_CONTENT[branch.key] ?? [])];
  const pathValue =
    branch.kind === "split" ? getActivePath(branch, answers)?.value : undefined;

  switch (branch.key) {
    case "hood_performance": {
      // Read only the active path's questions — indoors and outdoors use
      // different ids, so this prevents a stale answer from an abandoned path
      // from leaking into the result.
      const outdoors = pathValue === "outdoors";
      const length = asArray(answers[outdoors ? "hp_out_q19" : "hp_in_q18"]);
      const elbows = asArray(answers[outdoors ? "hp_out_q20" : "hp_in_q19"]);
      const restricted =
        elbows.some((e) => e === "3" || e === "4") ||
        length.some((l) => l === "30_40_feet" || l === "more_than_40_feet");
      if (restricted) diagnoses = promote(diagnoses, "hp_duct");

      // The window test is the definitive make-up-air signal, and it trumps
      // duct geometry (indoor question only).
      if (!outdoors && asArray(answers.hp_in_q24).includes("yes"))
        diagnoses = promote(diagnoses, "hp_mua");
      break;
    }

    case "blower": {
      // Specific speeds failing (rather than the whole blower) points at the
      // control board's speed relays, not the motor.
      const behavior = asArray(answers.blower_q7);
      const speeds = asArray(answers.blower_q8);
      const someSpeedsOnly =
        behavior.includes("runs_on_some_speeds_only") ||
        (speeds.length > 0 && !speeds.includes("all_speeds"));
      if (someSpeedsOnly) diagnoses = promote(diagnoses, "blower_control");
      break;
    }

    case "light": {
      const issue = asArray(answers.light_q6);
      const bulbsReplaced = asArray(answers.light_q8).includes("yes");
      const issueRemained = asArray(answers.light_q9).includes("yes");

      // All/multiple lights failing together — or fresh bulbs changing
      // nothing — is the driver, not the bulbs.
      if (
        issue.includes("all_lights_out") ||
        issue.includes("multiple_lights_out") ||
        (bulbsReplaced && issueRemained)
      )
        diagnoses = promote(diagnoses, "light_driver");

      // Lights that won't turn off are a control fault; the strongest signal
      // in this branch, so apply it last (promote puts it in front).
      if (issue.includes("lights_will_not_turn_off"))
        diagnoses = promote(diagnoses, "light_control");
      break;
    }

    case "electrical": {
      // Power verified at the outlet/junction but the hood is dead → the
      // fault is internal (board/harness), not the supply.
      if (asArray(answers.elec_q7).includes("yes"))
        diagnoses = promote(diagnoses, "elec_internal");
      break;
    }

    case "vibration": {
      const noise = asArray(answers.vib_q6);
      if (noise.includes("whistling")) diagnoses = promote(diagnoses, "vib_duct");
      if (noise.includes("grinding")) diagnoses = promote(diagnoses, "vib_motor");

      // The filter test beats everything: if the noise changes with the
      // filters removed, it's the filters/seating. Applied last so it wins.
      if (asArray(answers.vib_q8).includes("yes"))
        diagnoses = promote(diagnoses, "vib_filters");
      break;
    }
  }

  return { branchKey: branch.key, pathValue, diagnoses };
}
