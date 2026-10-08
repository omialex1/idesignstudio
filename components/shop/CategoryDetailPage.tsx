import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductsByCategorySlug } from "@/lib/db/products";
import ProductGrid from "@/components/product/ProductGrid";
import { lineConfig } from "@/lib/lines";
import type { ProductLine } from "@/lib/generated/prisma";

export default async function CategoryDetailPage({
  line,
  subcategory,
  locale,
}: {
  line: ProductLine;
  subcategory: string;
  locale: string;
}) {
  const category = await getProductsByCategorySlug(line, subcategory, locale);
  if (!category) notFound();

  const t = await getTranslations("Shop");
  const tNav = await getTranslations("Nav");
  const config = lineConfig(line);

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href={`/${config.slug}`}
          className="text-sm font-medium text-salamander-600 hover:underline"
        >
          {t("backTo", { name: tNav(config.navKey) })}
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
            <ProductGrid
              products={category.products}
              line={line}
              categorySlug={category.slug}
              locale={locale}
            />
          ) : (
            <p className="text-taupe-500">{t("noProducts")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
