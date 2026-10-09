// Runs in the browser before upload: shrinks a photo to at most
// MAX_SIDE_PX on its longest side and re-encodes it (WebP, or JPEG where the
// browser cannot encode WebP). Phone photos of several MB end up ~50-150 KB.
export const MAX_SIDE_PX = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

export async function compressImage(file: File): Promise<Blob> {
  // createImageBitmap applies the photo's EXIF rotation.
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );

  // Browsers that cannot encode WebP return PNG, so fall back to JPEG.
  const webp = await encode("image/webp", WEBP_QUALITY);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg", JPEG_QUALITY);
  if (!jpeg) throw new Error("encode_failed");
  return jpeg;
}
