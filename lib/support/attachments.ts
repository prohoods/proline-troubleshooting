// Deciding what actually travels with a support case.
//
// Photos are attached to the ticket directly. Video is not: Stopgap only takes
// images, and a phone or drone clip is large enough to kill the request before
// the server sees it — which reached the customer as "we couldn't send your
// request" on the final step. Video goes straight from the browser to blob
// storage instead, and the ticket carries a link (lib/support/videoUpload.ts).
//
// The video branch below is a backstop for a clip that slips through as a
// regular file — it's named for the agent rather than uploaded.

/** Serverless request bodies are small; stay well under the limit. */
const MAX_TOTAL_BYTES = 3.5 * 1024 * 1024;
const MAX_IMAGES = 8;

export interface AttachmentPlan {
  /** Images to upload, in order. */
  images: File[];
  /** Video the customer chose — named for the agent, never uploaded. */
  videoNames: string[];
  /** Images that couldn't come along. */
  droppedNames: string[];
}

/**
 * Split what the customer picked into what can travel and what can't.
 *
 * Only the count is capped here. The size budget is applied AFTER downscaling
 * (see fitToBudget) — a 4 MB phone photo compresses to a few hundred KB, so
 * judging it at full size would discard photos that would have fitted easily.
 */
export function planAttachments(files: File[]): AttachmentPlan {
  const images: File[] = [];
  const videoNames: string[] = [];
  const droppedNames: string[] = [];

  for (const f of files) {
    if (!f.type.startsWith("image/")) {
      videoNames.push(f.name);
      continue;
    }
    if (images.length >= MAX_IMAGES) {
      droppedNames.push(f.name);
      continue;
    }
    images.push(f);
  }

  return { images, videoNames, droppedNames };
}

/**
 * Apply the request-size budget to already-downscaled images, returning the
 * ones that fit plus the names of any left behind. Oversized requests fail
 * outright, which the customer sees as "we couldn't send your request".
 */
export function fitToBudget(files: File[]): { kept: File[]; dropped: string[] } {
  const kept: File[] = [];
  const dropped: string[] = [];
  let total = 0;
  for (const f of files) {
    if (total + f.size > MAX_TOTAL_BYTES) {
      dropped.push(f.name);
      continue;
    }
    kept.push(f);
    total += f.size;
  }
  return { kept, dropped };
}

/** A note for the ticket so the agent knows to ask for what didn't come across. */
export function attachmentNote(plan: AttachmentPlan): string {
  const lines: string[] = [];
  if (plan.videoNames.length) {
    lines.push(
      "",
      "VIDEO THE CUSTOMER RECORDED (not attached — ask them to send it)",
      ...plan.videoNames.map((n) => `- ${n}`),
    );
  }
  if (plan.droppedNames.length) {
    lines.push(
      "",
      "PHOTOS NOT ATTACHED (request too large)",
      ...plan.droppedNames.map((n) => `- ${n}`),
    );
  }
  return lines.join("\n");
}
