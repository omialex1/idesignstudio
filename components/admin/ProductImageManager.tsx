"use client";

import AdminCard from "@/components/admin/AdminCard";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/images/client-compress";

const MAX_IMAGES = 6;

type Image = { id: string; url: string };

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

  // Order shown while a photo is dragged and until the server answers. It only
  // counts while the saved order is still the one it was made from.
  const savedOrder = images.map((i) => i.id).join(",");
  const [moved, setMoved] = useState<{ base: string; ids: string[] } | null>(
    null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const shown =
    moved && moved.base === savedOrder
      ? moved.ids
          .map((id) => images.find((i) => i.id === id))
          .filter((i): i is Image => Boolean(i))
      : images;

  async function saveOrder(ids: string[]) {
    setMoved({ base: savedOrder, ids });
    setError(null);
    const res = await fetch(`/api/admin/products/${productId}/images/order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("Nu am putut salva ordinea. Încearcă din nou.");
      setMoved(null);
    }
    router.refresh();
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = shown.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    void saveOrder(ids);
  }

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
        const blob = await compressImage(file);
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
    <AdminCard
      title="Fotografii"
      className="max-w-2xl"
      bodyClassName="flex flex-col gap-4 p-6"
    >
      <div>
        <p className="text-xs text-taupe-400">
          Până la {MAX_IMAGES} fotografii (JPG, PNG sau WebP). Se redimensionează
          automat. Prima fotografie apare pe cardul produsului. Trage o
          fotografie peste alta ca să schimbi ordinea.
        </p>
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((img, index) => (
            <li
              key={img.id}
              draggable={!busy}
              onDragStart={(e) => {
                setDragId(img.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", img.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                if (overId !== img.id) setOverId(img.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dropOn(img.id);
                setDragId(null);
                setOverId(null);
              }}
              className={`flex cursor-grab flex-col gap-2 rounded-xl border p-2 active:cursor-grabbing ${
                overId === img.id && dragId && dragId !== img.id
                  ? "border-salamander-400 outline outline-2 outline-salamander-400"
                  : "border-cream-200"
              } ${dragId === img.id ? "opacity-50" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                draggable={false}
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
    </AdminCard>
  );
}
