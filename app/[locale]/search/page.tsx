import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import FilterableProducts from "@/components/shop/FilterableProducts";
import SearchForm from "@/components/layout/SearchForm";
import { searchProducts } from "@/lib/db/search";
import { MAX_QUERY_LENGTH } from "@/lib/search";
import { categoryColorClass } from "@/lib/category-colors";
import type { ShopProduct } from "@/lib/shop-filters";

// Search results are not pages to find through Google.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, MAX_QUERY_LENGTH) ?? "";

  const t = await getTranslations("Search");
  const results = query ? await searchProducts(query, locale) : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 pt-28 pb-16">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl text-taupe-800">{t("title")}</h1>
        <SearchForm initialQuery={query} autoFocus={!query} />
        {query && (
          <p className="text-sm text-taupe-600" aria-live="polite">
            {results.length === 0
              ? t("noResults", { query })
              : t("resultsFor", { count: results.length, query })}
          </p>
        )}
        {!query && <p className="text-sm text-taupe-500">{t("hint")}</p>}
      </div>

      {results.length > 0 && (
        <FilterableProducts
          relevanceFirst
          products={results.map(
            (r): ShopProduct => ({
              id: r.id,
              href: `/${r.mainSlug}/${r.categorySlug}/${r.slug}`,
              name: r.name,
              priceCents: r.priceCents,
              currency: r.currency,
              imageUrl: r.imageUrl,
              hasVariants: r.hasVariants,
              inStock: r.inStock,
              createdAt: r.createdAt,
              category: { slug: r.categorySlug, name: r.categoryName },
              placeholderClass: categoryColorClass(r.mainColorKey),
            }),
          )}
        />
      )}

      {query && results.length === 0 && (
        <p className="max-w-xl text-sm text-taupe-500">{t("tryAnother")}</p>
      )}
    </div>
  );
}
