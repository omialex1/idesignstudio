import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductsByCategorySlug } from "@/lib/db/products";
import ProductGrid from "@/components/product/ProductGrid";
import type { ProductLine } from "@/lib/generated/prisma";

const basePath: Record<ProductLine, "/events" | "/stationary"> = {
  EVENTS: "/events",
  STATIONARY: "/stationary",
};

const backKey: Record<ProductLine, "backToEvents" | "backToStationary"> = {
  EVENTS: "backToEvents",
  STATIONARY: "backToStationary",
};

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

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href={basePath[line]}
          className="text-sm font-medium text-terracotta-600 hover:underline"
        >
          {t(backKey[line])}
        </Link>
        <h1 className="mt-4 font-display text-3xl text-brown-800">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 max-w-xl text-brown-600">
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
            <p className="text-brown-500">{t("noProducts")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
