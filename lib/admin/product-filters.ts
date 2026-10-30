import { matchesAllWords, queryWords, MAX_QUERY_LENGTH } from "@/lib/search";

// Sorting and filtering of the product list in the admin (the address of the page
// holds the choices, so a filtered list can be bookmarked).

export type AdminProductSort =
  | "nou"
  | "nume"
  | "pret-asc"
  | "pret-desc"
  | "stoc-asc"
  | "stoc-desc"
  | "categorie";

export const ADMIN_PRODUCT_SORTS: [AdminProductSort, string][] = [
  ["nou", "Cele mai noi"],
  ["nume", "Nume A–Z"],
  ["pret-asc", "Preț crescător"],
  ["pret-desc", "Preț descrescător"],
  ["stoc-asc", "Stoc: de la cel mai mic"],
  ["stoc-desc", "Stoc: de la cel mai mare"],
  ["categorie", "Subcategorie"],
];

export type AdminProductFilter = {
  q: string;
  sort: AdminProductSort;
  // main category id, subcategory id ("" for any)
  main: string;
  sub: string;
  // "da" visible, "nu" hidden, "" any
  vis: "" | "da" | "nu";
  // "epuizat" (0), "redus" (at or under the threshold), "ok", "" any
  stoc: "" | "epuizat" | "redus" | "ok";
};

type FilterableProduct = {
  slug: string;
  priceCents: number;
  isActive: boolean;
  createdAt: Date;
  translations: { locale: string; name: string }[];
  inventory: { quantityOnHand: number; lowStockThreshold: number } | null;
  category: {
    id: string;
    mainCategoryId: string | null;
    translations: { locale: string; name: string }[];
  };
};

export function parseAdminProductFilter(params: {
  q?: string;
  sort?: string;
  cat?: string;
  sub?: string;
  vis?: string;
  stoc?: string;
}): AdminProductFilter {
  const sort =
    ADMIN_PRODUCT_SORTS.find(([key]) => key === params.sort)?.[0] ?? "nou";
  return {
    q: (params.q ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    sort,
    main: params.cat ?? "",
    sub: params.sub ?? "",
    vis: params.vis === "da" || params.vis === "nu" ? params.vis : "",
    stoc:
      params.stoc === "epuizat" ||
      params.stoc === "redus" ||
      params.stoc === "ok"
        ? params.stoc
        : "",
  };
}

export function stockState(p: FilterableProduct): "epuizat" | "redus" | "ok" {
  const qty = p.inventory?.quantityOnHand ?? 0;
  const threshold = p.inventory?.lowStockThreshold ?? 5;
  if (qty <= 0) return "epuizat";
  return qty <= threshold ? "redus" : "ok";
}

// the Romanian name (what the admin shows), else whatever exists
const firstName = (names: { locale: string; name: string }[]) =>
  (names.find((n) => n.locale === "ro") ?? names[0])?.name ?? "";

export function filterAndSortAdminProducts<T extends FilterableProduct>(
  products: T[],
  f: AdminProductFilter,
): T[] {
  const words = queryWords(f.q);
  const kept = products.filter((p) => {
    if (
      words.length > 0 &&
      !matchesAllWords(
        words,
        [
          p.slug,
          ...p.translations.map((t) => t.name),
          ...p.category.translations.map((t) => t.name),
        ].join(" "),
      )
    ) {
      return false;
    }
    if (f.main && p.category.mainCategoryId !== f.main) return false;
    if (f.sub && p.category.id !== f.sub) return false;
    if (f.vis === "da" && !p.isActive) return false;
    if (f.vis === "nu" && p.isActive) return false;
    if (f.stoc && stockState(p) !== f.stoc) return false;
    return true;
  });

  const qty = (p: T) => p.inventory?.quantityOnHand ?? 0;
  const sorted = [...kept];
  switch (f.sort) {
    case "nume":
      sorted.sort((a, b) =>
        firstName(a.translations).localeCompare(firstName(b.translations), "ro"),
      );
      break;
    case "pret-asc":
      sorted.sort((a, b) => a.priceCents - b.priceCents);
      break;
    case "pret-desc":
      sorted.sort((a, b) => b.priceCents - a.priceCents);
      break;
    case "stoc-asc":
      sorted.sort((a, b) => qty(a) - qty(b));
      break;
    case "stoc-desc":
      sorted.sort((a, b) => qty(b) - qty(a));
      break;
    case "categorie":
      sorted.sort(
        (a, b) =>
          firstName(a.category.translations).localeCompare(
            firstName(b.category.translations),
            "ro",
          ) ||
          firstName(a.translations).localeCompare(firstName(b.translations), "ro"),
      );
      break;
    default:
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return sorted;
}
