"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/lib/cart/store";
import { formatPrice } from "@/lib/format";
import {
  COLORS,
  DEFAULT_COMPONENT_ID,
  MAX_COLORS,
  MAX_COLOR_NOTE_LENGTH,
  colorLabel,
  colorSwatchUrl,
} from "@/lib/colors";
import type { ProductLine } from "@/lib/generated/prisma";

type Variant = { id: string; name: string; priceCents: number };
type ColorComponent = { id: string; name: string | null; maxColors: number };

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
  components,
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
  components: ColorComponent[];
}) {
  const t = useTranslations("Shop");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const addItem = useCartStore((state) => state.addItem);

  // A product with colour options but no listed components gets one generic
  // picker for the whole product.
  const pickers: ColorComponent[] = hasColorOptions
    ? components.length > 0
      ? components
      : [{ id: DEFAULT_COMPONENT_ID, name: null, maxColors: MAX_COLORS }]
    : [];

  const [variantId, setVariantId] = useState(variants[0]?.id ?? null);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = variant?.priceCents ?? priceCents;
  const missingColors = pickers.some((p) => (picked[p.id] ?? []).length === 0);

  function toggleColor(component: ColorComponent, colorId: string) {
    setPicked((current) => {
      const selected = current[component.id] ?? [];
      let next: string[];
      if (selected.includes(colorId)) {
        next = selected.filter((c) => c !== colorId);
      } else if (component.maxColors === 1) {
        next = [colorId];
      } else if (selected.length >= component.maxColors) {
        return current;
      } else {
        next = [...selected, colorId];
      }
      return { ...current, [component.id]: next };
    });
  }

  function handleAdd() {
    if (missingColors) return;
    addItem({
      productId,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      colorChoices: pickers.map((p) => ({
        componentId: p.id,
        componentName: p.name,
        colors: picked[p.id] ?? [],
      })),
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

      {inStock &&
        pickers.map((component) => {
          const selected = picked[component.id] ?? [];
          return (
            <fieldset key={component.id} className="flex flex-col gap-3">
              <legend className="text-sm font-medium text-taupe-700">
                {component.name
                  ? t("colorsFor", { name: component.name })
                  : t("chooseColors")}
              </legend>
              <p className="text-xs text-taupe-500">
                {component.maxColors === 1
                  ? t("colorsHintOne")
                  : t("colorsHint", { max: component.maxColors })}
              </p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {COLORS.map((color) => {
                  const isSelected = selected.includes(color.id);
                  const label = colorLabel(color.id, locale);
                  return (
                    <button
                      key={color.id}
                      type="button"
                      aria-pressed={isSelected}
                      title={label}
                      onClick={() => toggleColor(component, color.id)}
                      className="flex flex-col items-center gap-1 text-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={colorSwatchUrl(color.id)}
                        alt=""
                        className={`h-11 w-11 rounded-full object-cover transition-shadow ${
                          isSelected
                            ? "ring-2 ring-salamander-500 ring-offset-2"
                            : "ring-1 ring-cream-300"
                        }`}
                      />
                      <span
                        className={`text-[11px] leading-tight ${
                          isSelected
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
              {selected.length > 0 && (
                <p className="text-sm text-taupe-700">
                  {t("colorsChosen", {
                    names: selected.map((c) => colorLabel(c, locale)).join(", "),
                  })}
                </p>
              )}
            </fieldset>
          );
        })}

      {inStock && hasColorOptions && (
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
      )}

      {inStock && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={missingColors}
            className="w-fit rounded-full bg-salamander-500 px-8 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {justAdded ? tCart("added") : tCart("addToCart")}
          </button>
          {missingColors && (
            <p className="text-xs text-taupe-500">{t("pickColorFirst")}</p>
          )}
        </div>
      )}
    </div>
  );
}
