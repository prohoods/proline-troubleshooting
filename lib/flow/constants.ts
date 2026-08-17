// Sentinel stored as the order-lookup answer when the customer can't find their
// order (e.g. it predates the Shopify migration). Gates the manual hood
// questions, and is filtered out of the AI transcript.
export const NO_ORDER_VALUE = "no-order-on-file";

/** Question id for the manual contact step (shown only on the no-order path). */
export const CONTACT_QUESTION_ID = "p_contact";

/**
 * Ranges safety gate. Gas appliances get an emergency exit the hood flow
 * doesn't need: a hood problem is an inconvenience, a gas smell is a
 * leave-the-building event, and answering it with "a specialist will email you
 * within one to two business days" would be the wrong answer at the wrong
 * speed. Selecting the emergency option stops the flow and creates no ticket.
 */
export const SAFETY_GATE_ID = "r_safety_gate";
export const SAFETY_EMERGENCY_VALUE = "emergency";
