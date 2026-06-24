import type { Answers, AnswerValue } from "@/lib/types";
import type { Branch, BranchPath, CategoryFlow, Question, SplitBranch } from "./types";

/** The branch selected by the issue-type answer, if any. */
export function getActiveBranch(
  flow: CategoryFlow,
  answers: Answers,
): Branch | undefined {
  const key = answers[flow.issueType.id];
  if (typeof key !== "string") return undefined;
  return flow.branches.find((b) => b.key === key);
}

/** The Indoors/Outdoors sub-path selected within a split branch, if any. */
export function getActivePath(
  branch: SplitBranch,
  answers: Answers,
): BranchPath | undefined {
  const value = answers[branch.split.id];
  if (typeof value !== "string") return undefined;
  return branch.paths.find((p) => p.value === value);
}

function ruleMatches(
  rule: NonNullable<Question["visibleWhen"]>,
  answers: Answers,
): boolean {
  const v = answers[rule.questionId];
  const arr = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  return rule.equals.some((e) => arr.includes(e));
}

/** Whether a question is currently shown (its visibleWhen gate passes). */
export function isVisible(q: Question, answers: Answers): boolean {
  return !q.visibleWhen || ruleMatches(q.visibleWhen, answers);
}

const visible = (qs: Question[], answers: Answers): Question[] =>
  qs.filter((q) => isVisible(q, answers));

/**
 * The ordered list of questions to ask given the answers so far. The list grows
 * as branch-point questions (issue type, indoor/outdoor) get answered, and
 * shrinks as `visibleWhen` gates hide questions (e.g. the manual hood questions
 * appear only when no order was found).
 */
export function buildSteps(flow: CategoryFlow, answers: Answers): Question[] {
  const steps: Question[] = [
    ...visible(flow.productInfo, answers),
    flow.issueType,
  ];
  const branch = getActiveBranch(flow, answers);
  if (!branch) return steps;

  if (branch.kind === "linear") {
    steps.push(...visible(branch.questions, answers));
  } else {
    steps.push(...visible(branch.preSplit, answers), branch.split);
    const path = getActivePath(branch, answers);
    if (path) steps.push(...visible(path.questions, answers));
  }
  return steps;
}

const isEmpty = (v: AnswerValue | undefined): boolean =>
  v === undefined ||
  (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0);

/** Whether a question's requirement is satisfied (optional ones always pass). */
export function isAnswered(q: Question, answers: Answers): boolean {
  if (q.optional) return true;
  return !isEmpty(answers[q.id]);
}

/** A human-readable section label for the eyebrow/progress chrome. */
export function sectionLabel(
  flow: CategoryFlow,
  answers: Answers,
  q: Question,
): string {
  if (flow.productInfo.some((p) => p.id === q.id)) return "Product details";
  if (q.id === flow.issueType.id) return "Issue type";
  return getActiveBranch(flow, answers)?.label ?? "Issue";
}

export interface AnswerRecord {
  questionId: string;
  prompt: string;
  value: AnswerValue;
}

/** Flatten the answers that are actually on the active path, for persistence. */
export function collectAnswers(
  flow: CategoryFlow,
  answers: Answers,
): AnswerRecord[] {
  const out: AnswerRecord[] = [];
  for (const q of buildSteps(flow, answers)) {
    const v = answers[q.id];
    if (!isEmpty(v)) out.push({ questionId: q.id, prompt: q.prompt, value: v! });
    if (q.followUp) {
      // Only persist the follow-up if its trigger still holds — otherwise an
      // answer typed before the parent changed would leak into the record.
      const parent = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
      const triggered = q.followUp.showWhen.some((s) => parent.includes(s));
      const fv = answers[q.followUp.id];
      if (triggered && !isEmpty(fv)) {
        out.push({
          questionId: q.followUp.id,
          prompt: q.followUp.prompt,
          value: fv!,
        });
      }
    }
  }
  return out;
}

/** Every question across the flow (productInfo, issue type, all branches/paths). */
export function allQuestions(flow: CategoryFlow): Question[] {
  const qs: Question[] = [...flow.productInfo, flow.issueType];
  for (const b of flow.branches) {
    if (b.kind === "linear") {
      qs.push(...b.questions);
    } else {
      qs.push(...b.preSplit, b.split);
      for (const p of b.paths) qs.push(...p.questions);
    }
  }
  return qs;
}

/** Like collectAnswers, but single/multi option values are mapped to their labels. */
export function collectAnswersDisplay(
  flow: CategoryFlow,
  answers: Answers,
): AnswerRecord[] {
  const byId = new Map(allQuestions(flow).map((q) => [q.id, q]));
  return collectAnswers(flow, answers).map((rec) => {
    const opts = byId.get(rec.questionId)?.options;
    if (!opts) return rec;
    const toLabel = (v: string) => opts.find((o) => o.value === v)?.label ?? v;
    return {
      ...rec,
      value: Array.isArray(rec.value)
        ? rec.value.map(toLabel)
        : typeof rec.value === "string"
          ? toLabel(rec.value)
          : rec.value,
    };
  });
}

/**
 * Largest possible number of steps across all branches/paths. Used to keep the
 * progress bar from ever moving backward before a branch/path is chosen.
 */
export function maxSteps(flow: CategoryFlow): number {
  const base = flow.productInfo.length + 1; // productInfo + issueType
  let max = base;
  for (const b of flow.branches) {
    const n =
      b.kind === "linear"
        ? base + b.questions.length
        : base +
          b.preSplit.length +
          1 +
          Math.max(0, ...b.paths.map((p) => p.questions.length));
    max = Math.max(max, n);
  }
  return max;
}

/**
 * Projected total steps given current commitments (branch, then path). The total
 * only shrinks as the path is narrowed, so progress = index / total jumps forward
 * — never backward — without needing a stored floor (keeps render pure).
 */
export function projectedTotal(flow: CategoryFlow, answers: Answers): number {
  const base = visible(flow.productInfo, answers).length + 1;
  const branch = getActiveBranch(flow, answers);
  if (!branch) return maxSteps(flow);
  if (branch.kind === "linear")
    return base + visible(branch.questions, answers).length;
  const path = getActivePath(branch, answers);
  if (path)
    return (
      base +
      visible(branch.preSplit, answers).length +
      1 +
      visible(path.questions, answers).length
    );
  return (
    base +
    visible(branch.preSplit, answers).length +
    1 +
    Math.max(0, ...branch.paths.map((p) => visible(p.questions, answers).length))
  );
}
