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

  async function handleCreate(formData: FormData) {
    const result = await createProduct(formData);
    // Validation problems: nothing was created, the form keeps what was typed.
    if ("errors" in result) return result;

    // The product exists now, so the photos can be attached to it.
    let failed = 0;
    for (const photo of photos) {
      const body = new FormData();
      body.append("file", photo.blob, "photo");
      const res = await fetch(`/api/admin/products/${result.id}/images`, {
        method: "POST",
        body,
      }).catch(() => null);
      if (!res?.ok) failed += 1;
    }

    const query = failed > 0 ? `created=1&photoError=${failed}` : "created=1";
    router.push(`/admin/products/${result.id}/edit?${query}`);
  }

  return (
    <ProductForm
      onSubmit={handleCreate}
      categories={categories}
      submitLabel="Creează produs"
      extra={<PhotoPicker photos={photos} onChange={setPhotos} />}
    />
  );
}
