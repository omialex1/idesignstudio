"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/lib/cart/store";
import { formatPrice } from "@/lib/format";
import {
  ALL_COMPONENTS_ID,
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
  // target for the whole product.
  const pickers: ColorComponent[] = hasColorOptions
    ? components.length > 0
      ? components
      : [{ id: DEFAULT_COMPONENT_ID, name: null, maxColors: MAX_COLORS }]
    : [];
  // With two or more components the customer can colour the whole set at once.
  const setTarget: ColorComponent | null =
    pickers.length >= 2
      ? {
          id: ALL_COMPONENTS_ID,
          name: t("wholeSet"),
          maxColors: Math.max(...pickers.map((p) => p.maxColors)),
        }
      : null;
  const targets = setTarget ? [...pickers, setTarget] : pickers;

  const [variantId, setVariantId] = useState(variants[0]?.id ?? null);
  // One shared palette: `activeId` says which component (or the whole set)
  // the next colour click applies to. Picks are remembered per target.
  const [activeId, setActiveId] = useState(pickers[0]?.id ?? "");
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  // Which kind of choice counts: separate components or the whole set. Both
  // are remembered, the one used last wins.
  const [mode, setMode] = useState<"each" | "set">("each");
  const [note, setNote] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = variant?.priceCents ?? priceCents;

  const wholeSetPicked =
    setTarget !== null &&
    mode === "set" &&
    (picked[ALL_COMPONENTS_ID] ?? []).length > 0;
  const finalTargets = wholeSetPicked && setTarget ? [setTarget] : pickers;
  const missingColors = finalTargets.some(
    (p) => (picked[p.id] ?? []).length === 0,
  );
  const active = targets.find((x) => x.id === activeId) ?? targets[0];

  function toggleColor(colorId: string) {
    if (!active) return;
    const selected = picked[active.id] ?? [];
    let next: string[];
    if (selected.includes(colorId)) {
      next = selected.filter((c) => c !== colorId);
    } else if (active.maxColors === 1) {
      next = [colorId];
    } else if (selected.length >= active.maxColors) {
      return;
    } else {
      next = [...selected, colorId];
    }

    const isSet = active.id === ALL_COMPONENTS_ID;
    const updated = { ...picked, [active.id]: next };
    setPicked(updated);
    setMode(isSet ? "set" : "each");

    // Once a component is full, move on to the next one still without colours.
    if (!isSet && next.length === active.maxColors) {
      const start = pickers.findIndex((p) => p.id === active.id);
      for (let step = 1; step < pickers.length; step++) {
        const candidate = pickers[(start + step) % pickers.length];
        if ((updated[candidate.id] ?? []).length === 0) {
          setActiveId(candidate.id);
          break;
        }
      }
    }
  }

  function handleAdd() {
    if (missingColors) return;
    addItem({
      productId,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      colorChoices: finalTargets.map((p) => ({
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

      {inStock && active && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-taupe-700">
            {t("chooseColors")}
          </legend>

          {targets.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-taupe-500">{t("colorsTargetHint")}</p>
              <div className="flex flex-wrap gap-2">
                {targets.map((target) => {
                  const own = picked[target.id] ?? [];
                  const isActive = target.id === active.id;
                  const isSet = target.id === ALL_COMPONENTS_ID;
                  // A component is covered when it, or the whole set, has colours.
                  const setColors = picked[ALL_COMPONENTS_ID] ?? [];
                  const shown = isSet
                    ? wholeSetPicked
                      ? setColors
                      : []
                    : wholeSetPicked
                      ? setColors
                      : own;
                  const covered = shown.length > 0;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setActiveId(target.id);
                        if ((picked[target.id] ?? []).length > 0) {
                          setMode(isSet ? "set" : "each");
                        }
                      }}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "border-salamander-500 bg-salamander-50 font-semibold text-salamander-700"
                          : covered
                            ? "border-cream-300 text-taupe-800 hover:border-salamander-400"
                            : "border-dashed border-taupe-300 text-taupe-600 hover:border-salamander-400"
                      }`}
                    >
                      {target.name}
                      {shown.length > 0 ? (
                        <span className="flex -space-x-1">
                          {shown.map((c) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={c}
                              src={colorSwatchUrl(c)}
                              alt={colorLabel(c, locale)}
                              className="h-5 w-5 rounded-full object-cover ring-1 ring-white"
                            />
                          ))}
                        </span>
                      ) : (
                        <span className="text-taupe-400">—</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-sm font-medium text-taupe-700">
            {active.id === ALL_COMPONENTS_ID
              ? t("colorsForSet")
              : active.name
                ? t("colorsFor", { name: active.name })
                : t("chooseColors")}
          </p>
          <p className="-mt-2 text-xs text-taupe-500">
            {active.maxColors === 1
              ? t("colorsHintOne")
              : t("colorsHint", { max: active.maxColors })}
          </p>

          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {COLORS.map((color) => {
              const isSelected = (picked[active.id] ?? []).includes(color.id);
              const label = colorLabel(color.id, locale);
              return (
                <button
                  key={color.id}
                  type="button"
                  aria-pressed={isSelected}
                  title={label}
                  onClick={() => toggleColor(color.id)}
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
            disabled={missingColors}
            className="w-fit rounded-full bg-salamander-500 px-8 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {justAdded ? tCart("added") : tCart("addToCart")}
          </button>
          {missingColors && (
            <p className="text-xs text-taupe-500">
              {targets.length > 1 ? t("pickColorAll") : t("pickColorFirst")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
