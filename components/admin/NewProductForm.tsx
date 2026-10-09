"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/admin/product-actions";
import ProductForm from "@/components/admin/ProductForm";
import PhotoPicker, { type PickedPhoto } from "@/components/admin/PhotoPicker";
import type { ProductLine } from "@/lib/generated/prisma";

type CategoryOption = { id: string; name: string; line: ProductLine };

export default function NewProductForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setError(null);

    let productId: string;
    try {
      ({ id: productId } = await createProduct(formData));
    } catch {
      setError(
        "Nu am putut crea produsul. Verifică datele: adresa (slug-ul) poate exista deja sau lipsește un câmp obligatoriu.",
      );
      return;
    }

    // The product exists now, so the photos can be attached to it.
    let failed = 0;
    for (const photo of photos) {
      const body = new FormData();
      body.append("file", photo.blob, "photo");
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        body,
      }).catch(() => null);
      if (!res?.ok) failed += 1;
    }

    const query = failed > 0 ? `created=1&photoError=${failed}` : "created=1";
    router.push(`/admin/products/${productId}/edit?${query}`);
  }

  return (
    <ProductForm
      action={handleCreate}
      categories={categories}
      submitLabel="Creează produs"
      extra={
        <>
          <PhotoPicker photos={photos} onChange={setPhotos} />
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </>
      }
    />
  );
}
