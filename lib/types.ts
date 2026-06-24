// Shared primitives used across the flow engine, diagnoses, and storage.

export type AnswerValue = string | string[];

/** Answers are keyed by Question.id (and FollowUp.id). */
export type Answers = Record<string, AnswerValue | undefined>;
