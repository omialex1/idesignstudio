"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/admin/product-actions";
import ProductForm from "@/components/admin/ProductForm";
import PhotoPicker, { type PickedPhoto } from "@/components/admin/PhotoPicker";
import ProductGroupsCard, {
  type PendingGroup,
} from "@/components/admin/ProductGroupsCard";
import type { PaletteOption } from "@/lib/admin/queries";
type CategoryOption = { id: string; name: string; mainCategoryId: string };

export default function NewProductForm({
  categories,
  mainCategories,
  colorMainIds,
  palettes,
}: {
  categories: CategoryOption[];
  mainCategories: { id: string; name: string }[];
  colorMainIds: string[];
  palettes: Record<string, PaletteOption[]>;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [groups, setGroups] = useState<PendingGroup[]>([]);

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

    // and the groups chosen for it
    for (const group of groups) {
      if ("groupId" in group) {
        await fetch(`/api/admin/products/${result.id}/groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: group.groupId }),
        }).catch(() => null);
      } else {
        await fetch("/api/admin/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: group.newName,
            typeId: group.type.id,
            productIds: [result.id],
          }),
        }).catch(() => null);
      }
    }

    const query = failed > 0 ? `created=1&photoError=${failed}` : "created=1";
    router.push(`/admin/products/${result.id}/edit?${query}`);
  }

  return (
    <ProductForm
      onSubmit={handleCreate}
      categories={categories}
      mainCategories={mainCategories}
      colorMainIds={colorMainIds}
      palettes={palettes}
      submitLabel="Creează produs"
      draftKey="new"
      extra={
        <>
          <ProductGroupsCard
            productId={null}
            pending={groups}
            onPendingChange={setGroups}
          />
          <PhotoPicker photos={photos} onChange={setPhotos} />
        </>
      }
    />
  );
}
