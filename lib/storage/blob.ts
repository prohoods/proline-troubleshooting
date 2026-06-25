import { put } from "@vercel/blob";

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
