// Sorting and filtering of the product lists in the shop (category pages and
// search results). Pure functions on plain data, used in the browser, so the
// page itself stays the same for everyone and loads fast.

export type ShopProduct = {
  id: string;
  href: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  hasVariants: boolean;
  inStock: boolean;
  // ISO date, for "newest first"
  createdAt: string;
  // the subcategory, for lists that mix several (search results)
  category?: { slug: string; name: string };
  // background class of the photo placeholder (by main category)
  placeholderClass: string;
};

export type SortKey = "default" | "price-asc" | "price-desc" | "new" | "name";

export type ShopFilters = {
  sort: SortKey;
  // prices as typed, in RON ("" when empty)
  min: string;
  max: string;
  // subcategory slugs (none chosen: all)
  categories: string[];
};

// The price groups of the filters panel, in cents: from (included) to (excluded).
export const PRICE_RANGES: { from: number; to: number | null }[] = [
  { from: 0, to: 5000 },
  { from: 5000, to: 10000 },
  { from: 10000, to: 20000 },
  { from: 20000, to: null },
];

export const NO_FILTERS: ShopFilters = {
  sort: "default",
  min: "",
  max: "",
  categories: [],
};

export function hasActiveFilters(f: ShopFilters): boolean {
  return (
    f.sort !== "default" ||
    f.min.trim() !== "" ||
    f.max.trim() !== "" ||
    f.categories.length > 0
  );
}

function ronToCents(value: string): number | null {
  const n = Number(value.trim().replace(",", "."));
  return value.trim() !== "" && Number.isFinite(n) && n >= 0
    ? Math.round(n * 100)
    : null;
}

export function applyShopFilters(
  products: ShopProduct[],
  f: ShopFilters,
  locale: string,
): ShopProduct[] {
  const min = ronToCents(f.min);
  const max = ronToCents(f.max);

  const kept = products.filter((p) => {
    if (min !== null && p.priceCents < min) return false;
    if (max !== null && p.priceCents > max) return false;
    if (
      f.categories.length > 0 &&
      !(p.category && f.categories.includes(p.category.slug))
    ) {
      return false;
    }
    return true;
  });

  const sorted = [...kept];
  switch (f.sort) {
    case "price-asc":
      sorted.sort((a, b) => a.priceCents - b.priceCents);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.priceCents - a.priceCents);
      break;
    case "new":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, locale));
      break;
    default:
      break; // the order the page came with
  }
  return sorted;
}
