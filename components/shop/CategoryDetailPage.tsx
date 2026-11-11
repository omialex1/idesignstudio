import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getProductsByCategorySlug } from "@/lib/db/products";
import FilterableProducts from "@/components/shop/FilterableProducts";
import { categoryColorClass } from "@/lib/category-colors";
import { canQuickAdd } from "@/lib/product-card";
import type { ShopProduct } from "@/lib/shop-filters";
import type { MainCategory } from "@/lib/main-categories";

export default async function CategoryDetailPage({
  main,
  subcategory,
  locale,
}: {
  main: MainCategory;
  subcategory: string;
  locale: string;
}) {
  const category = await getProductsByCategorySlug(main.id, subcategory, locale);
  if (!category) notFound();

  const t = await getTranslations("Shop");

  const products: ShopProduct[] = category.products.map((p) => ({
    id: p.id,
    href: `/${main.slug}/${category.slug}/${p.slug}`,
    name: p.name,
    priceCents: p.promo?.finalCents ?? p.priceCents,
    oldPriceCents: p.promo?.oldCents ?? null,
    percentOff: p.promo?.percentOff ?? 0,
    promoLabel: p.promo?.label ?? null,
    currency: p.currency,
    imageUrl: p.imageUrl,
    hasVariants: p.hasVariants,
    inStock: p.quantityOnHand > 0,
    slug: p.slug,
    categorySlug: category.slug,
    mainSlug: main.slug,
    colorKey: main.colorKey,
    quickAdd: canQuickAdd(
      {
        hasVariants: p.hasVariants,
        hasColorOptions: p.hasColorOptions,
        inStock: p.quantityOnHand > 0,
      },
      main.usesColors,
    ),
    createdAt: p.createdAt,
    placeholderClass: categoryColorClass(main.colorKey),
  }));

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="font-display text-3xl text-taupe-800">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 max-w-xl text-taupe-600">
            {category.description}
          </p>
        )}

        <div className="mt-10">
          {category.products.length > 0 ? (
            <FilterableProducts products={products} />
          ) : (
            <p className="text-taupe-500">{t("noProducts")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
