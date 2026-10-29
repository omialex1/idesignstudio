import { prisma } from "@/lib/db/client";
import {
  MAX_QUERY_LENGTH,
  matchesAllWords,
  normalizeSearch,
  queryWords,
  scoreMatch,
} from "@/lib/search";

export type SearchResult = {
  id: string;
  slug: string;
  mainSlug: string;
  mainColorKey: string;
  categorySlug: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  hasVariants: boolean;
  inStock: boolean;
  createdAt: string;
};

const MAX_RESULTS = 60;

// Active products whose name, descriptions or category contain every word of the
// query, best matches first. The catalogue is small, so the text is compared in
// code (which also ignores diacritics); a database index can replace this when
// the catalogue grows to thousands of products.
export async function searchProducts(
  query: string,
  locale: string,
): Promise<SearchResult[]> {
  const words = queryWords(query);
  if (words.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      translations: true,
      inventory: { select: { quantityOnHand: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      variants: { select: { id: true } },
      category: {
        include: {
          translations: true,
          mainCategory: { select: { slug: true, color: true } },
        },
      },
    },
  });

  const scored: { score: number; result: SearchResult }[] = [];
  for (const p of products) {
    if (!p.category.mainCategory) continue;
    const shown =
      p.translations.find((t) => t.locale === locale) ??
      p.translations.find((t) => t.locale === "ro");
    const nameAll = p.translations.map((t) => t.name).join(" ");
    const categoryAll = p.category.translations.map((t) => t.name).join(" ");
    const rest = [
      p.slug,
      ...p.translations.flatMap((t) => [t.description ?? "", t.longDescription ?? ""]),
    ].join(" ");

    if (!matchesAllWords(words, `${nameAll} ${categoryAll} ${rest}`)) continue;

    scored.push({
      score: scoreMatch(words, { name: nameAll, category: categoryAll, rest }),
      result: {
        id: p.id,
        slug: p.slug,
        mainSlug: p.category.mainCategory.slug,
        mainColorKey: p.category.mainCategory.color,
        categorySlug: p.category.slug,
        name: shown?.name ?? p.slug,
        priceCents: p.priceCents,
        currency: p.currency,
        imageUrl: p.images[0]?.url ?? null,
        hasVariants: p.variants.length > 0,
        inStock: (p.inventory?.quantityOnHand ?? 0) > 0,
        createdAt: p.createdAt.toISOString(),
      },
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => s.result);
}

// ---- suggestions while typing ----

export type Suggestion = { name: string; href: string };

type SuggestEntry = {
  // shown name per language (only the part before " – ", as on the cards)
  names: Record<string, string>;
  href: string;
};

let suggestCache: { at: number; entries: SuggestEntry[] } | null = null;
const SUGGEST_CACHE_MS = 60 * 1000;

// The names of all active products, kept for a minute so typing does not hit the
// database on every letter.
async function suggestEntries(): Promise<SuggestEntry[]> {
  if (suggestCache && Date.now() - suggestCache.at < SUGGEST_CACHE_MS) {
    return suggestCache.entries;
  }
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      translations: { select: { locale: true, name: true } },
      category: {
        select: { slug: true, mainCategory: { select: { slug: true } } },
      },
    },
  });
  const entries: SuggestEntry[] = [];
  for (const p of products) {
    if (!p.category.mainCategory) continue;
    const names: Record<string, string> = {};
    for (const t of p.translations) names[t.locale] = t.name.split(" – ")[0];
    entries.push({
      names,
      href: `/${p.category.mainCategory.slug}/${p.category.slug}/${p.slug}`,
    });
  }
  suggestCache = { at: Date.now(), entries };
  return entries;
}

// Up to 3 product names that start with what was typed (or, next, have a word
// that starts with it), ignoring diacritics and case.
export async function suggestProducts(
  query: string,
  locale: string,
): Promise<Suggestion[]> {
  const typed = normalizeSearch(query.trim().slice(0, MAX_QUERY_LENGTH)).replace(
    /\s+/g,
    " ",
  );
  if (typed.length < 2) return [];

  const ranked: { rank: number; name: string; href: string }[] = [];
  for (const entry of await suggestEntries()) {
    // matched against the name shown, in the customer's language
    const name = entry.names[locale] ?? entry.names.ro ?? Object.values(entry.names)[0];
    if (!name) continue;
    const key = normalizeSearch(name);
    let rank = 0;
    if (key.startsWith(typed)) rank = 2;
    else if (key.split(/[^a-z0-9]+/).some((w) => w && w.startsWith(typed))) rank = 1;
    if (rank === 0) continue;
    ranked.push({ rank, name, href: entry.href });
  }
  return ranked
    .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, locale))
    .slice(0, 3)
    .map(({ name, href }) => ({ name, href }));
}
