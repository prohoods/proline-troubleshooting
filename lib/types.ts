// Shared primitives used across the flow engine, diagnoses, and storage.

/**
 * Who is driving the questionnaire. "agent" is the internal console (AI
 * diagnoses shown inline, ticket tooling). "customer" is the storefront-facing
 * flow: scripted diagnoses only — the AI runs server-side at case-submit time
 * and is visible to the agent inside the Stopgap ticket, never to the customer.
 */
export type AppMode = "agent" | "customer";

export type AnswerValue = string | string[];

/** Answers are keyed by Question.id (and FollowUp.id). */
export type Answers = Record<string, AnswerValue | undefined>;
