"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/lib/cart/store";
import { formatPrice } from "@/lib/format";
import {
  COLORS,
  MAX_COLORS,
  MAX_COLOR_NOTE_LENGTH,
  colorLabel,
  colorSwatchUrl,
} from "@/lib/colors";
import type { ProductLine } from "@/lib/generated/prisma";

type Variant = { id: string; name: string; priceCents: number };

export default function ProductPurchase({
  productId,
  slug,
  categorySlug,
  line,
  name,
  priceCents,
  currency,
  inStock,
  imageUrl,
  variants,
  hasColorOptions,
}: {
  productId: string;
  slug: string;
  categorySlug: string;
  line: ProductLine;
  name: string;
  priceCents: number;
  currency: string;
  inStock: boolean;
  imageUrl?: string | null;
  variants: Variant[];
  hasColorOptions: boolean;
}) {
  const t = useTranslations("Shop");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const addItem = useCartStore((state) => state.addItem);

  const [variantId, setVariantId] = useState(variants[0]?.id ?? null);
  const [colors, setColors] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = variant?.priceCents ?? priceCents;
  const needsColors = hasColorOptions && colors.length === 0;

  function toggleColor(id: string) {
    setColors((current) => {
      if (current.includes(id)) return current.filter((c) => c !== id);
      if (current.length >= MAX_COLORS) return current;
      return [...current, id];
    });
  }

  function handleAdd() {
    if (needsColors) return;
    addItem({
      productId,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      colors: hasColorOptions ? colors : [],
      colorNote: hasColorOptions && note.trim() ? note.trim() : null,
      slug,
      categorySlug,
      line,
      nameSnapshot: name,
      priceCents: unitPrice,
      currency,
      imageUrl,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="font-display text-2xl text-taupe-800">
        {formatPrice(unitPrice, currency, locale)}
      </p>

      {inStock && variants.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-taupe-700">
            {t("chooseOption")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={v.id === variantId}
                onClick={() => setVariantId(v.id)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  v.id === variantId
                    ? "border-salamander-500 bg-salamander-50 font-semibold text-salamander-700"
                    : "border-cream-200 text-taupe-700 hover:border-salamander-400"
                }`}
              >
                {v.name}
                <span className="ml-2 text-taupe-500">
                  {formatPrice(v.priceCents, currency, locale)}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {inStock && hasColorOptions && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-taupe-700">
            {t("chooseColors")}
          </legend>
          <p className="text-xs text-taupe-500">
            {t("colorsHint", { max: MAX_COLORS })}
          </p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {COLORS.map((color) => {
              const selected = colors.includes(color.id);
              const label = colorLabel(color.id, locale);
              return (
                <button
                  key={color.id}
                  type="button"
                  aria-pressed={selected}
                  title={label}
                  onClick={() => toggleColor(color.id)}
                  className="flex flex-col items-center gap-1 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={colorSwatchUrl(color.id)}
                    alt=""
                    className={`h-11 w-11 rounded-full object-cover transition-shadow ${
                      selected
                        ? "ring-2 ring-salamander-500 ring-offset-2"
                        : "ring-1 ring-cream-300"
                    }`}
                  />
                  <span
                    className={`text-[11px] leading-tight ${
                      selected
                        ? "font-semibold text-salamander-700"
                        : "text-taupe-600"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          {colors.length > 0 && (
            <p className="text-sm text-taupe-700">
              {t("colorsChosen", {
                names: colors.map((c) => colorLabel(c, locale)).join(", "),
              })}
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-taupe-700">
              {t("colorNoteLabel")}
            </span>
            <input
              value={note}
              maxLength={MAX_COLOR_NOTE_LENGTH}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("colorNotePlaceholder")}
              className="rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400"
            />
          </label>
        </fieldset>
      )}

      {inStock && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={needsColors}
            className="w-fit rounded-full bg-salamander-500 px-8 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {justAdded ? tCart("added") : tCart("addToCart")}
          </button>
          {needsColors && (
            <p className="text-xs text-taupe-500">{t("pickColorFirst")}</p>
          )}
        </div>
      )}
    </div>
  );
}
