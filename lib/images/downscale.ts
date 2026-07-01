// Client-side: downscale/compress a large photo before upload so the request
// stays reasonable. Falls back to the original file if the type can't be decoded
// (e.g. HEIC in most browsers) or on any error — the server still base64-encodes
// and enforces the hard 10 MB / image-type limits.

const MAX_DIM = 2000; // longest edge, px
const RESIZE_ABOVE_BYTES = 1.5 * 1024 * 1024;
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function downscaleImage(file: File): Promise<File> {
  if (!RESIZABLE.has(file.type) || file.size <= RESIZE_ABOVE_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file; // no win → keep original

    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
