"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/lib/cart/store";
import {
  CART_ADDED_EVENT,
  type CartAddedDetail,
} from "@/components/cart/CartToast";
import { formatPrice } from "@/lib/format";
import { priceView, type ProductPromo } from "@/lib/discount-math";
import {
  ALL_COMPONENTS_ID,
  DEFAULT_COMPONENT_ID,
  MAX_COLORS,
} from "@/lib/colors";
import type { PaletteColor } from "@/lib/db/colors";
import { swatchStyle } from "@/lib/colors-shared";
import {
  firstTierMin,
  rangeLabel,
  tierFor,
  tierRanges,
  type PriceTier,
} from "@/lib/tiers";

// A round colour sample: the texture photo when there is one, else the colour.
function Swatch({
  color,
  label = "",
  className,
}: {
  color: PaletteColor | undefined;
  label?: string;
  className: string;
}) {
  if (color?.swatchUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={color.swatchUrl}
        alt={label}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      className={`inline-block rounded-full ${className}`}
      style={swatchStyle(color?.hex ?? "#CCCCCC")}
    />
  );
}

type ColorComponent = { id: string; name: string | null; maxColors: number };
type Variant = {
  id: string;
  name: string;
  priceCents: number;
  fullPriceCents: number;
  discountPercent: number;
  components: ColorComponent[];
};

export default function ProductPurchase({
  productId,
  slug,
  categorySlug,
  mainSlug,
  colorKey,
  name,
  priceCents,
  currency,
  inStock,
  imageUrl,
  variants,
  hasColorOptions,
  components,
  colors,
  tiers,
  availableQuantity,
  promo = null,
}: {
  productId: string;
  slug: string;
  categorySlug: string;
  mainSlug: string;
  colorKey: string;
  name: string;
  priceCents: number;
  currency: string;
  inStock: boolean;
  imageUrl?: string | null;
  variants: Variant[];
  hasColorOptions: boolean;
  components: ColorComponent[];
  // the colours of this product's category, in the order set in the admin
  colors: PaletteColor[];
  // price tiers by quantity (invitations); empty for ordinary products
  tiers: PriceTier[];
  availableQuantity: number;
  // a discount switched on for this product (never for tiered products)
  promo?: ProductPromo | null;
}) {
  const t = useTranslations("Shop");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const addItem = useCartStore((state) => state.addItem);
  const colorById = new Map(colors.map((c) => [c.id, c]));
  const colorName = (id: string) => {
    const c = colorById.get(id);
    return c ? (locale === "en" ? c.en : c.ro) : id;
  };

  // A product with colour options but no listed components gets one generic
  // target for the whole product.
  const [variantId, setVariantId] = useState(variants[0]?.id ?? null);
  const variant = variants.find((v) => v.id === variantId) ?? null;

  // Colours are picked only for the pieces of the chosen variant.
  const basePieces = (variant ? variant.components : components).map((c) => ({
    ...c,
    maxColors: MAX_COLORS,
  }));
  const pickers: ColorComponent[] = hasColorOptions
    ? basePieces.length > 0
      ? basePieces
      : [{ id: DEFAULT_COMPONENT_ID, name: null, maxColors: MAX_COLORS }]
    : [];
  // With two or more components the customer can colour the whole set at once.
  const setTarget: ColorComponent | null =
    pickers.length >= 2
      ? {
          id: ALL_COMPONENTS_ID,
          name: t("wholeSet"),
          maxColors: MAX_COLORS,
        }
      : null;
  const targets = setTarget ? [...pickers, setTarget] : pickers;

  // One shared palette: `activeId` says which component (or the whole set)
  // the next colour click applies to. Picks are remembered per target.
  const [activeId, setActiveId] = useState(pickers[0]?.id ?? "");
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  // Which kind of choice counts: separate components or the whole set. Both
  // are remembered, the one used last wins.
  const [mode, setMode] = useState<"each" | "set">("each");
  const [justAdded, setJustAdded] = useState(false);

  // Tiered products: the customer types a quantity, the price follows it.
  const tiered = tiers.length > 0;
  const minQty = tiered ? firstTierMin(tiers) : 1;
  const maxQty = Math.max(minQty, availableQuantity);
  const [qtyText, setQtyText] = useState(String(minQty));
  const qtyNumber = Number(qtyText);
  const qtyValid =
    Number.isInteger(qtyNumber) && qtyNumber >= minQty && qtyNumber <= maxQty;
  const quantity = qtyValid ? qtyNumber : minQty;
  const activeTier = tiered ? tierFor(tiers, quantity) : null;
  const ranges = tiered ? tierRanges(tiers) : [];
  const activeRange = activeTier
    ? ranges.find(
        (r) =>
          r.priceCents === activeTier.priceCents &&
          quantity >= r.from &&
          (r.to === null || quantity <= r.to),
      )
    : undefined;

  const regularPrice =
    activeTier?.priceCents ?? variant?.priceCents ?? priceCents;
  // with a group discount: the price paid, the prior price (lowest of the 30 days
  // before the reduction) struck through and the percentage against that
  const promoOn = promo !== null && !tiered;
  const viewOf = (price: number, key: number) =>
    promoOn ? priceView(price, promo.percent, promo.priorByKey[key] ?? price) : null;
  const variantKey = variant ? variants.findIndex((v) => v.id === variant.id) : -1;
  const view = viewOf(regularPrice, variantKey);
  const unitPrice = view ? view.finalCents : regularPrice;

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
    if (missingColors || (tiered && !qtyValid)) return;
    addItem(
      {
        productId,
        variantId: variant?.id ?? null,
        variantName: variant?.name ?? null,
        colorChoices: finalTargets.map((p) => ({
          componentId: p.id,
          componentName: p.name,
          colors: picked[p.id] ?? [],
          labels: Object.fromEntries(
            (picked[p.id] ?? []).map((id) => [
              id,
              {
                ro: colorById.get(id)?.ro ?? id,
                en: colorById.get(id)?.en ?? id,
              },
            ]),
          ),
        })),
        colorNote: null,
        slug,
        categorySlug,
        mainSlug,
        colorKey,
        nameSnapshot: name,
        priceCents: unitPrice,
        fullPriceCents: view?.priorCents ?? null,
        discountPercent: view && view.priorCents ? view.shownPercent : null,
        discountLabel: promo?.label ?? null,
        currency,
        imageUrl,
        ...(tiered ? { tiers, tierRange: activeRange } : {}),
      },
      tiered ? quantity : 1,
    );
    window.dispatchEvent(
      new CustomEvent<CartAddedDetail>(CART_ADDED_EVENT, {
        detail: {
          name,
          variantName: variant?.name ?? null,
          imageUrl: imageUrl ?? null,
        },
      }),
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-2xl text-taupe-800">
          <span>{formatPrice(unitPrice, currency, locale)}</span>
          {view?.priorCents && (
            <span className="text-lg text-taupe-400 line-through">
              {formatPrice(view.priorCents, currency, locale)}
            </span>
          )}
          {view?.priorCents && (
            <span className="rounded-full bg-salamander-500 px-2.5 py-0.5 font-sans text-sm font-semibold text-cream-50">
              −{view.shownPercent}%
            </span>
          )}
          {promo?.label && (
            <span className="rounded-full border border-salamander-400 px-2.5 py-0.5 font-sans text-xs font-semibold tracking-wide text-salamander-700 uppercase">
              {promo.label}
            </span>
          )}
          {tiered && (
            <span className="ml-1 text-base text-taupe-500">{t("perPiece")}</span>
          )}
        </p>
        {view?.priorCents && (
          <p className="text-xs text-taupe-500">
            {t("previousPrice", {
              price: formatPrice(view.priorCents, currency, locale),
            })}
          </p>
        )}
      </div>

      {tiered && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-taupe-700">
            {t("tiersHeading")}
          </p>
          {/* plain information, not choices: the active row only follows the quantity */}
          <dl className="flex flex-col divide-y divide-cream-200 rounded-xl border border-cream-200 bg-white/60 text-sm">
            {ranges.map((r) => {
              const on = r === activeRange;
              return (
                <div
                  key={r.from}
                  className={`flex items-center justify-between px-4 py-2 ${
                    on
                      ? "bg-salamander-50 font-semibold text-salamander-700"
                      : "text-taupe-600"
                  }`}
                >
                  <dt>{rangeLabel(r, locale)}</dt>
                  <dd>
                    {formatPrice(r.priceCents, currency, locale)}{" "}
                    {t("perPiece")}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="text-xs text-taupe-500">{t("tiersNote")}</p>
        </div>
      )}

      {tiered && inStock && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="tiered-quantity"
            className="text-sm font-medium text-taupe-700"
          >
            {t("quantityLabel")}
          </label>
          <input
            id="tiered-quantity"
            type="text"
            inputMode="numeric"
            value={qtyText}
            onChange={(e) =>
              setQtyText(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            onFocus={(e) => e.target.select()}
            className="w-32 rounded-xl border border-cream-300 bg-white px-4 py-2 text-lg text-taupe-800 focus:border-salamander-400 focus:outline-none"
          />
          <p className="text-xs text-taupe-500">
            {!qtyValid
              ? qtyNumber > maxQty
                ? t("maxAvailable", { max: maxQty })
                : t("minOrder", { min: minQty })
              : t("quantityHint")}
          </p>
          {qtyValid && (
            <p className="text-sm font-semibold text-taupe-800">
              {t("totalFor", {
                qty: quantity,
                total: formatPrice(unitPrice * quantity, currency, locale),
              })}
            </p>
          )}
        </div>
      )}

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
                {promoOn
                  ? (() => {
                      const vv = viewOf(
                        v.priceCents,
                        variants.findIndex((x) => x.id === v.id),
                      );
                      return (
                        <>
                          {vv?.priorCents && (
                            <span className="ml-2 text-taupe-400 line-through">
                              {formatPrice(vv.priorCents, currency, locale)}
                            </span>
                          )}
                          <span className="ml-2 text-taupe-500">
                            {formatPrice(vv?.finalCents ?? v.priceCents, currency, locale)}
                          </span>
                        </>
                      );
                    })()
                  : (
                    <>
                      {v.discountPercent > 0 && (
                        <span className="ml-2 text-taupe-400 line-through">
                          {formatPrice(v.fullPriceCents, currency, locale)}
                        </span>
                      )}
                      <span className="ml-2 text-taupe-500">
                        {formatPrice(v.priceCents, currency, locale)}
                      </span>
                    </>
                  )}
                {!promoOn && v.discountPercent > 0 && (
                  <span className="ml-2 rounded-full bg-salamander-500 px-2 py-0.5 text-xs font-semibold text-cream-50">
                    −{v.discountPercent}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {inStock && active && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-taupe-700">
            {targets.length <= 1 && active.maxColors === 1
              ? t("chooseColor")
              : t("chooseColors")}
          </legend>

          {targets.length > 1 && (
            <div className="flex flex-col gap-2">
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
                            <Swatch
                              key={c}
                              color={colorById.get(c)}
                              label={colorName(c)}
                              className="h-5 w-5 ring-1 ring-white"
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

          {(active.id === ALL_COMPONENTS_ID || active.name) && (
            <p className="text-sm font-medium text-taupe-700">
              {active.id === ALL_COMPONENTS_ID
                ? active.maxColors === 1
                  ? t("colorForSet")
                  : t("colorsForSet")
                : active.maxColors === 1
                  ? t("colorFor", { name: active.name ?? "" })
                  : t("colorsFor", { name: active.name ?? "" })}
            </p>
          )}
          {/* one colour per piece is the rule today, so there is nothing more to say;
              the hint only shows if a piece ever allows several colours */}
          {active.maxColors > 1 && (
            <p className="-mt-2 text-xs text-taupe-500">
              {t("colorsHint", { max: active.maxColors })}
            </p>
          )}

          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {colors.map((color) => {
              const isSelected = (picked[active.id] ?? []).includes(color.id);
              const label = colorName(color.id);
              return (
                <button
                  key={color.id}
                  type="button"
                  aria-pressed={isSelected}
                  title={label}
                  onClick={() => toggleColor(color.id)}
                  className="flex flex-col items-center gap-1 text-center"
                >
                  <Swatch
                    color={color}
                    className={`h-11 w-11 transition-shadow ${
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
        </fieldset>
      )}

      {inStock && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={missingColors || (tiered && !qtyValid)}
            className="w-fit rounded-full bg-salamander-500 px-8 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {justAdded ? tCart("added") : tCart("addToCart")}
          </button>
          {/* with one thing to colour the heading above is enough; with several
              pieces, say what is still missing */}
          {missingColors && targets.length > 1 && (
            <p className="text-xs text-taupe-500">{t("pickColorAll")}</p>
          )}
        </div>
      )}
    </div>
  );
}
