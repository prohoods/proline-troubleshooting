// Typed model of the troubleshooting flow.
//
// Source of truth: the "Proline General Troubleshooting Questionnaire" flow
// diagram (FigJam). Most branches are a linear sequence of questions; the
// Hood Performance / Airflow branch additionally splits into Indoors / Outdoors
// sub-paths. This model captures both shapes.

export type QuestionType = "single" | "multi" | "text" | "upload";

export interface Option {
  value: string;
  label: string;
}

/** An optional conditional text field revealed when a parent answer matches. */
export interface FollowUp {
  id: string;
  prompt: string;
  /** Show the follow-up when the parent answer includes one of these values. */
  showWhen: string[];
  placeholder?: string;
}

export interface Question {
  id: string;
  /** The "QUESTION N" label from the source diagram, for traceability. */
  legacyLabel?: string;
  prompt: string;
  type: QuestionType;
  /** Choices (single/multi) or, for upload questions, the requested attachments. */
  options?: Option[];
  placeholder?: string;
  /** Optional questions never block "Continue" (text, uploads, terminal notes). */
  optional?: boolean;
  followUp?: FollowUp;
  /** The end-of-branch "Additional Information" node. */
  terminal?: boolean;
}

export interface LinearBranch {
  key: string;
  label: string;
  kind: "linear";
  questions: Question[];
}

export interface BranchPath {
  value: string;
  label: string;
  questions: Question[];
}

export interface SplitBranch {
  key: string;
  label: string;
  kind: "split";
  preSplit: Question[];
  split: Question;
  paths: BranchPath[];
}

export type Branch = LinearBranch | SplitBranch;

export interface CategoryFlow {
  /** Asked first, for every issue (order/model, hood age). */
  productInfo: Question[];
  /** Single-select whose option `value` equals the chosen branch `key`. */
  issueType: Question;
  branches: Branch[];
}
