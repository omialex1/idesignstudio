"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/lib/cart/store";
import type { ProductLine } from "@/lib/generated/prisma";

export default function AddToCartButton({
  productId,
  slug,
  categorySlug,
  line,
  name,
  priceCents,
  currency,
  inStock,
}: {
  productId: string;
  slug: string;
  categorySlug: string;
  line: ProductLine;
  name: string;
  priceCents: number;
  currency: string;
  inStock: boolean;
}) {
  const t = useTranslations("Cart");
  const addItem = useCartStore((state) => state.addItem);
  const [justAdded, setJustAdded] = useState(false);

  if (!inStock) return null;

  function handleAdd() {
    addItem({
      productId,
      slug,
      categorySlug,
      line,
      nameSnapshot: name,
      priceCents,
      currency,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="w-fit rounded-full bg-terracotta-500 px-8 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-terracotta-600"
    >
      {justAdded ? t("added") : t("addToCart")}
    </button>
  );
}
