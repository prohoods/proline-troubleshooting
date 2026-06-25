// Sentinel stored as the order-lookup answer when the customer can't find their
// order (e.g. it predates the Shopify migration). Gates the manual hood
// questions, and is filtered out of the AI transcript.
export const NO_ORDER_VALUE = "no-order-on-file";

/** Question id for the manual contact step (shown only on the no-order path). */
export const CONTACT_QUESTION_ID = "p_contact";
