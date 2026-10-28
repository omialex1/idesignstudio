import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import ProductTile, { shortName } from "@/components/product/ProductTile";
import SearchForm from "@/components/layout/SearchForm";
import Reveal from "@/components/layout/Reveal";
import { searchProducts } from "@/lib/db/search";
import { MAX_QUERY_LENGTH } from "@/lib/search";
import { categoryColorClass } from "@/lib/category-colors";
import { formatPrice } from "@/lib/format";

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
  const tShop = await getTranslations("Shop");
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
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {results.map((r, i) => {
            const price = formatPrice(r.priceCents, r.currency, locale);
            return (
              <Reveal key={r.id} index={i % 3}>
                <ProductTile
                  href={`/${r.mainSlug}/${r.categorySlug}/${r.slug}`}
                  name={shortName(r.name)}
                  imageUrl={r.imageUrl}
                  placeholderClass={categoryColorClass(r.mainColorKey)}
                  priceLabel={r.hasVariants ? tShop("fromPrice", { price }) : price}
                  note={r.inStock ? undefined : tShop("outOfStock")}
                />
              </Reveal>
            );
          })}
        </div>
      )}

      {query && results.length === 0 && (
        <p className="max-w-xl text-sm text-taupe-500">{t("tryAnother")}</p>
      )}
    </div>
  );
}
