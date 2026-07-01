// Types for the Proline support-case API (Stopgap) integration.

export interface SupportImage {
  /** Image bytes as base64, or a data URL ("data:image/jpeg;base64,…"). */
  base64: string;
  fileName?: string;
  contentType?: string;
}

/** Body we POST to the Proline support API. Field names are case-insensitive. */
export interface SupportCaseRequest {
  name: string;
  email: string;
  message: string;
  phone?: string;
  subject?: string;
  model?: string;
  serialNumber?: string;
  orderNumber?: string;
  troubleshootingSummary?: string;
  images?: SupportImage[];
}

/** Success shape (HTTP 200) returned by the Proline support API. */
export interface SupportApiSuccess {
  Success: boolean;
  CaseId: number;
  AttachedImages: number;
}

/** What our own /api/support route returns to the browser. */
export type SupportResult =
  | { ok: true; caseId: number; attachedImages: number }
  | { ok: false; error: string };
