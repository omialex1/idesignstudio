import { prisma } from "@/lib/db/client";
import {
  matchesAllWords,
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
      },
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => s.result);
}
