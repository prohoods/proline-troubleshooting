import { del, list, put } from "@vercel/blob";

/**
 * Two ways to reach the store, and the newer one carries no token.
 *
 * Connecting a Blob store to a Vercel project now sets BLOB_STORE_ID and lets
 * the runtime authenticate with the OIDC token it injects; a
 * BLOB_READ_WRITE_TOKEN is only present on older connections. Checking for the
 * token alone reported "no storage" on a project that had it all along, which
 * is why run PDFs were being generated and silently dropped.
 */
export const blobConfigured = (): boolean =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

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
 * Delete everything under `prefix` older than `days`.
 *
 * Both the things we store are personal data that nothing references once a
 * case is closed: customer videos showing the inside of someone's home, and
 * run PDFs carrying their contact and order details. They age out on the same
 * schedule as the database rows they belong to.
 */
export async function pruneBlobs(prefix: string, days: number): Promise<number> {
  if (!blobConfigured()) return 0;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let cursor: string | undefined;
  let deleted = 0;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
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
