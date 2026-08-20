import { del, list, put } from "@vercel/blob";

export const blobConfigured = (): boolean =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Upload a run's PDF to Vercel Blob and return its URL. A random suffix keeps
 * the URL unguessable (the PDF contains customer details).
 */
export async function uploadRunPdf(id: string, pdf: Buffer): Promise<string> {
  const { url } = await put(`runs/${id}.pdf`, pdf, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: true,
  });
  return url;
}

/**
 * Delete customer videos older than `days`.
 *
 * Videos are uploaded straight from the browser and only ever referenced from a
 * support case, so nothing here points back at them once the case is closed.
 * They're the largest thing we store and they show the inside of someone's
 * home — both reasons to age them out on the same schedule as the runs.
 */
export async function pruneVideos(days: number): Promise<number> {
  if (!blobConfigured()) return 0;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let cursor: string | undefined;
  let deleted = 0;

  do {
    const page = await list({ prefix: "support-video/", cursor, limit: 1000 });
    const stale = page.blobs
      .filter((b) => b.uploadedAt.getTime() < cutoff)
      .map((b) => b.url);
    if (stale.length) {
      await del(stale);
      deleted += stale.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return deleted;
}
