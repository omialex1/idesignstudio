"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ProductTile, { shortName } from "@/components/product/ProductTile";
import { formatPrice } from "@/lib/format";
import {
  NO_FILTERS,
  PRICE_RANGES,
  applyShopFilters,
  hasActiveFilters,
  type ShopFilters,
  type ShopProduct,
  type SortKey,
} from "@/lib/shop-filters";

const fieldClass =
  "rounded-full border border-cream-300 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M2 4.5 6 8.5 10 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A group of options in the filters panel, one under another.
function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-1 border-t border-cream-200 pt-3 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-sm font-semibold text-taupe-800">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

// A product list with sorting and filters. The first order is the one the page
// gives; everything else happens in the browser.
export default function FilterableProducts({
  products,
  relevanceFirst = false,
}: {
  products: ShopProduct[];
  // search results: the default order is "best match", not "recommended"
  relevanceFirst?: boolean;
}) {
  const t = useTranslations("Shop");
  const locale = useLocale();
  const [filters, setFilters] = useState<ShopFilters>(NO_FILTERS);
  const [open, setOpen] = useState<"sort" | "filters" | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // a click outside the row, or Escape, closes the open panel
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const set = <K extends keyof ShopFilters>(key: K, value: ShopFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const shown = applyShopFilters(products, filters, locale);
  const showFilters = products.length > 1;

  // price ranges that at least one product falls in, with how many
  const ranges = PRICE_RANGES.map((r) => ({
    ...r,
    count: products.filter(
      (p) => p.priceCents >= r.from && (r.to === null || p.priceCents < r.to),
    ).length,
  })).filter((r) => r.count > 0);
  const rangeLabel = (from: number, to: number | null) =>
    from === 0
      ? t("priceUnder", { n: (to ?? 0) / 100 })
      : to === null
        ? t("priceOver", { n: from / 100 })
        : t("priceBetween", { a: from / 100, b: to / 100 });

  // subcategories (when the list mixes several, like the search results)
  const categories = new Map<string, { name: string; count: number }>();
  for (const p of products) {
    if (!p.category) continue;
    const entry = categories.get(p.category.slug);
    if (entry) entry.count++;
    else categories.set(p.category.slug, { name: p.category.name, count: 1 });
  }
  const categoryList = [...categories.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name, locale),
  );
  const hasPrice = filters.min.trim() !== "" || filters.max.trim() !== "";
  const filterCount =
    (hasPrice ? 1 : 0) + (filters.categories.length > 0 ? 1 : 0);

  const sortOptions: [SortKey, string][] = [
    ["default", relevanceFirst ? t("sortRelevance") : t("sortDefault")],
    ["price-asc", t("sortPriceAsc")],
    ["price-desc", t("sortPriceDesc")],
    ["new", t("sortNew")],
    ["name", t("sortName")],
  ];

  const buttonClass = (isOpen: boolean, active: boolean) =>
    `flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
      isOpen || active
        ? "border-salamander-500 bg-salamander-50 text-taupe-800"
        : "border-cream-300 bg-white text-taupe-700 hover:border-salamander-400"
    }`;
  const panelClass =
    "absolute left-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-cream-300 bg-white p-4 shadow-lg";
  const optionClass =
    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-taupe-700 hover:bg-cream-100";

  return (
    <div className="flex flex-col gap-6">
      {showFilters && (
        <div
          ref={barRef}
          role="group"
          aria-label={t("filtersLabel")}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="relative">
            <button
              type="button"
              aria-expanded={open === "sort"}
              onClick={() => setOpen(open === "sort" ? null : "sort")}
              className={buttonClass(open === "sort", filters.sort !== "default")}
            >
              {t("sortBy")}
              <Chevron open={open === "sort"} />
            </button>
            {open === "sort" && (
              <div className={panelClass}>
                <ul className="flex flex-col gap-1">
                  {sortOptions.map(([key, label]) => (
                    <li key={key}>
                      <button
                        type="button"
                        aria-pressed={filters.sort === key}
                        onClick={() => {
                          set("sort", key);
                          setOpen(null);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          filters.sort === key
                            ? "bg-salamander-50 font-semibold text-taupe-800"
                            : "text-taupe-700 hover:bg-cream-100"
                        }`}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-expanded={open === "filters"}
              onClick={() => setOpen(open === "filters" ? null : "filters")}
              className={buttonClass(open === "filters", filterCount > 0)}
            >
              {t("filtersButton")}
              {filterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-salamander-500 px-1 text-xs font-semibold text-cream-50">
                  {filterCount}
                </span>
              )}
              <Chevron open={open === "filters"} />
            </button>
            {open === "filters" && (
              <div
                className={`${panelClass} flex max-h-[70vh] flex-col gap-3 overflow-y-auto`}
              >
                <FilterGroup title={t("priceFilter")}>
                  {ranges.map((r) => {
                    const min = r.from === 0 ? "" : String(r.from / 100);
                    const max = r.to === null ? "" : String((r.to - 1) / 100);
                    const selected = filters.min === min && filters.max === max;
                    return (
                      <label key={r.from} className={optionClass}>
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="price-range"
                            checked={selected}
                            onChange={() =>
                              setFilters((c) => ({ ...c, min, max }))
                            }
                            className="h-4 w-4 accent-salamander-500"
                          />
                          {rangeLabel(r.from, r.to)}
                        </span>
                        <span className="text-xs text-taupe-400">
                          ({r.count})
                        </span>
                      </label>
                    );
                  })}
                  <div className="mt-1 flex items-end gap-2">
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
                </FilterGroup>

                {categoryList.length > 1 && (
                  <FilterGroup title={t("subcategoryFilter")}>
                    {categoryList.map(([slug, c]) => (
                      <label key={slug} className={optionClass}>
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={filters.categories.includes(slug)}
                            onChange={(e) =>
                              set(
                                "categories",
                                e.target.checked
                                  ? [...filters.categories, slug]
                                  : filters.categories.filter((s) => s !== slug),
                              )
                            }
                            className="h-4 w-4 accent-salamander-500"
                          />
                          {c.name}
                        </span>
                        <span className="text-xs text-taupe-400">
                          ({c.count})
                        </span>
                      </label>
                    ))}
                  </FilterGroup>
                )}
              </div>
            )}
          </div>

          <span
            aria-live="polite"
            className="ml-auto whitespace-nowrap text-sm text-taupe-600"
          >
            {t("resultsCount", { count: shown.length })}
          </span>
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="whitespace-nowrap text-sm font-medium text-salamander-600 hover:underline"
            >
              {t("resetShort")}
            </button>
          )}
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
