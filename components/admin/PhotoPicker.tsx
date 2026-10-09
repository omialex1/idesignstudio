"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/images/client-compress";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/images/product-images";

export type PickedPhoto = { id: string; blob: Blob; previewUrl: string };

// Photo chooser for the "new product" form: photos are resized in the browser
// right away and uploaded once the product has been created.
export default function PhotoPicker({
  photos,
  onChange,
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);

    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_IMAGES_PER_PRODUCT) {
        setError(`Maximum ${MAX_IMAGES_PER_PRODUCT} fotografii per produs.`);
        break;
      }
      try {
        const blob = await compressImage(file);
        next.push({
          id: crypto.randomUUID(),
          blob,
          previewUrl: URL.createObjectURL(blob),
        });
      } catch {
        setError("Nu am putut citi una dintre fotografii. Încearcă alt fișier.");
      }
    }

    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
    setBusy(false);
  }

  function remove(id: string) {
    const removed = photos.find((p) => p.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onChange(photos.filter((p) => p.id !== id));
  }

  function makeMain(id: string) {
    const chosen = photos.find((p) => p.id === id);
    if (!chosen) return;
    onChange([chosen, ...photos.filter((p) => p.id !== id)]);
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
      <div>
        <h2 className="font-display text-lg text-taupe-800">Fotografii</h2>
        <p className="mt-1 text-xs text-taupe-400">
          Până la {MAX_IMAGES_PER_PRODUCT} fotografii (JPG, PNG sau WebP). Se
          redimensionează automat și se încarcă după ce salvezi produsul. Prima
          fotografie apare pe cardul produsului.
        </p>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="flex flex-col gap-2 rounded-xl border border-cream-200 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
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
                    onClick={() => makeMain(photo.id)}
                    className="text-taupe-600 hover:underline"
                  >
                    Fă principală
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(photo.id)}
                  className="text-red-600 hover:underline"
                >
                  Elimină
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
          disabled={busy || photos.length >= MAX_IMAGES_PER_PRODUCT}
          onChange={(e) => handleFiles(e.target.files)}
          className="text-sm text-taupe-700 file:mr-3 file:rounded-full file:border-0 file:bg-cream-200 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-taupe-800 hover:file:bg-cream-300"
        />
        {busy && <span className="text-sm text-taupe-500">Se pregătesc...</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
