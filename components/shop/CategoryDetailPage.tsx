import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductsByCategorySlug } from "@/lib/db/products";
import FilterableProducts from "@/components/shop/FilterableProducts";
import { categoryColorClass } from "@/lib/category-colors";
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
    priceCents: p.priceCents,
    currency: p.currency,
    imageUrl: p.imageUrl,
    hasVariants: p.hasVariants,
    inStock: p.quantityOnHand > 0,
    createdAt: p.createdAt,
    placeholderClass: categoryColorClass(main.colorKey),
  }));

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href={`/${main.slug}`}
          className="text-sm font-medium text-salamander-600 hover:underline"
        >
          {t("backTo", { name: main.name })}
        </Link>
        <h1 className="mt-4 font-display text-3xl text-taupe-800">
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
