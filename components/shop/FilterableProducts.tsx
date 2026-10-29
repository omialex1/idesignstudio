"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ProductTile, { shortName } from "@/components/product/ProductTile";
import { formatPrice } from "@/lib/format";
import {
  NO_FILTERS,
  applyShopFilters,
  hasActiveFilters,
  type ShopFilters,
  type ShopProduct,
  type SortKey,
} from "@/lib/shop-filters";

export type PaletteChoice = {
  id: string;
  name: string;
  hex: string;
  swatchUrl: string | null;
};

const fieldClass =
  "rounded-full border border-cream-300 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

// A product list with sorting and filters (price, in stock, colour). The first
// order is the one the page gives; everything else happens in the browser.
export default function FilterableProducts({
  products,
  palette = [],
  relevanceFirst = false,
}: {
  products: ShopProduct[];
  // colours to filter by (only for categories that use colours)
  palette?: PaletteChoice[];
  // search results: the default order is "best match", not "recommended"
  relevanceFirst?: boolean;
}) {
  const t = useTranslations("Shop");
  const locale = useLocale();
  const [filters, setFilters] = useState<ShopFilters>(NO_FILTERS);

  const set = <K extends keyof ShopFilters>(key: K, value: ShopFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const shown = applyShopFilters(products, filters, locale);
  // only colours that at least one product here offers
  const offered = new Set(products.flatMap((p) => p.colors));
  const colours = palette.filter((c) => offered.has(c.id));
  const showFilters = products.length > 1;

  return (
    <div className="flex flex-col gap-6">
      {showFilters && (
        <div
          role="group"
          aria-label={t("filtersLabel")}
          className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white/70 p-4"
        >
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
              {t("sortBy")}
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as SortKey)}
                className={fieldClass}
              >
                <option value="default">
                  {relevanceFirst ? t("sortRelevance") : t("sortDefault")}
                </option>
                <option value="price-asc">{t("sortPriceAsc")}</option>
                <option value="price-desc">{t("sortPriceDesc")}</option>
                <option value="new">{t("sortNew")}</option>
                <option value="name">{t("sortName")}</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
                {t("priceFrom")}
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={filters.min}
                  onChange={(e) => set("min", e.target.value)}
                  placeholder="0"
                  className={`${fieldClass} w-24`}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
                {t("priceTo")}
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={filters.max}
                  onChange={(e) => set("max", e.target.value)}
                  placeholder="∞"
                  className={`${fieldClass} w-24`}
                />
              </label>
              <span className="pb-2 text-xs text-taupe-500">RON</span>
            </div>

            <label className="flex items-center gap-2 pb-2 text-sm text-taupe-700">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) => set("inStockOnly", e.target.checked)}
                className="h-4 w-4 accent-salamander-500"
              />
              {t("inStockOnly")}
            </label>
          </div>

          {colours.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-taupe-500">
                {t("colourFilter")}
              </span>
              <div className="flex flex-wrap gap-2">
                {colours.map((c) => {
                  const active = filters.color === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => set("color", active ? "" : c.id)}
                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        active
                          ? "border-salamander-500 ring-2 ring-salamander-300"
                          : "border-white shadow-[0_0_0_1px_rgba(60,40,25,0.25)]"
                      }`}
                      style={
                        c.swatchUrl
                          ? {
                              backgroundImage: `url(${c.swatchUrl})`,
                              backgroundSize: "cover",
                            }
                          : { backgroundColor: c.hex }
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-taupe-600">
            <span aria-live="polite">
              {t("resultsCount", { count: shown.length })}
            </span>
            {hasActiveFilters(filters) && (
              <button
                type="button"
                onClick={() => setFilters(NO_FILTERS)}
                className="font-medium text-salamander-600 hover:underline"
              >
                {t("resetFilters")}
              </button>
            )}
          </div>
        </div>
      )}

      {shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {shown.map((p) => {
            const price = formatPrice(p.priceCents, p.currency, locale);
            return (
              <ProductTile
                key={p.id}
                href={p.href}
                name={shortName(p.name)}
                imageUrl={p.imageUrl}
                placeholderClass={p.placeholderClass}
                priceLabel={p.hasVariants ? t("fromPrice", { price }) : price}
                note={p.inStock ? undefined : t("outOfStock")}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-taupe-500">{t("noMatches")}</p>
      )}
    </div>
  );
}
