import { LOGO_SIZE, MAX_LOGO_BYTES } from "@score-masterz/data";

/** Biggest original we'll try to process; phone photos are usually well under this. */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/**
 * Shrinks an image to fit LOGO_SIZE × LOGO_SIZE and re-encodes it as WebP,
 * lowering quality until it is under MAX_LOGO_BYTES. Runs entirely in the browser.
 */
export async function optimiseLogo(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (PNG, JPG, WebP…).");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is over 20 MB. Choose a smaller one.");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That image couldn't be read. Try a PNG or JPG.");
  });
  const scale = Math.min(1, LOGO_SIZE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images here.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.9, 0.8, 0.65, 0.5, 0.35]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    // Browsers without WebP encoding fall back to PNG; the type check catches that.
    if (blob && blob.type === "image/webp" && blob.size <= MAX_LOGO_BYTES) return blob;
  }
  throw new Error("Couldn't get this logo under 1 MB. Try a simpler image.");
}
