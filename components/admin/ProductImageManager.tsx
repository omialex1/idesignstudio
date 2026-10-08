"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_IMAGES = 6;
const MAX_SIDE_PX = 1600;

type Image = { id: string; url: string };

async function toCompressedBlob(file: File): Promise<Blob> {
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
  const webp = await encode("image/webp", 0.82);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg", 0.85);
  if (!jpeg) throw new Error("encode_failed");
  return jpeg;
}

const ERRORS: Record<string, string> = {
  limit_reached: `Maximum ${MAX_IMAGES} fotografii per produs.`,
  too_large: "Fotografia este prea mare.",
  invalid_type: "Format neacceptat (folosește JPG, PNG sau WebP).",
  unauthorized: "Sesiunea a expirat. Conectează-te din nou.",
};

export default function ProductImageManager({
  productId,
  images,
}: {
  productId: string;
  images: Image[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);

    let count = images.length;
    for (const file of Array.from(files)) {
      if (count >= MAX_IMAGES) {
        setError(ERRORS.limit_reached);
        break;
      }
      try {
        const blob = await toCompressedBlob(file);
        const body = new FormData();
        body.append("file", blob, "photo");
        const res = await fetch(`/api/admin/products/${productId}/images`, {
          method: "POST",
          body,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(ERRORS[data?.error] ?? "Încărcarea a eșuat.");
          break;
        }
        count += 1;
      } catch {
        setError("Nu am putut citi fotografia. Încearcă alt fișier.");
        break;
      }
    }

    if (inputRef.current) inputRef.current.value = "";
    setBusy(false);
    router.refresh();
  }

  async function call(imageId: string, method: "DELETE" | "PATCH") {
    setBusy(true);
    setError(null);
    const res = await fetch(
      `/api/admin/products/${productId}/images/${imageId}`,
      { method },
    ).catch(() => null);
    if (!res?.ok) setError("Operațiunea a eșuat. Încearcă din nou.");
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
      <div>
        <h2 className="font-display text-lg text-taupe-800">Fotografii</h2>
        <p className="mt-1 text-xs text-taupe-400">
          Până la {MAX_IMAGES} fotografii (JPG, PNG sau WebP). Se redimensionează
          automat. Prima fotografie apare pe cardul produsului.
        </p>
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, index) => (
            <li
              key={img.id}
              className="flex flex-col gap-2 rounded-xl border border-cream-200 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className="aspect-square w-full rounded-lg object-cover"
              />
              <div className="flex items-center justify-between text-xs">
                {index === 0 ? (
                  <span className="font-semibold text-salamander-600">
                    Principală
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => call(img.id, "PATCH")}
                    className="text-taupe-600 hover:underline disabled:opacity-50"
                  >
                    Fă principală
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => call(img.id, "DELETE")}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  Șterge
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || images.length >= MAX_IMAGES}
          onChange={(e) => handleFiles(e.target.files)}
          className="text-sm text-taupe-700 file:mr-3 file:rounded-full file:border-0 file:bg-cream-200 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-taupe-800 hover:file:bg-cream-300"
        />
        {busy && <span className="text-sm text-taupe-500">Se lucrează...</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
