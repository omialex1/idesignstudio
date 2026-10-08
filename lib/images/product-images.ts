export const MAX_IMAGES_PER_PRODUCT = 6;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function productImageUrl(imageId: string) {
  return `/api/product-images/${imageId}`;
}

export function detectImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  const startsWith = (sig: number[], offset = 0) =>
    sig.every((b, i) => bytes[offset + i] === b);

  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}
