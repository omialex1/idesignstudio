import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductDetail } from "@/lib/db/products";
import { lineConfig } from "@/lib/lines";
import ProductPurchase from "@/components/product/ProductPurchase";
import ProductGallery from "@/components/product/ProductGallery";
import type { ProductLine } from "@/lib/generated/prisma";

export default async function ProductDetailPage({
  line,
  subcategory,
  product: productSlug,
  locale,
}: {
  line: ProductLine;
  subcategory: string;
  product: string;
  locale: string;
}) {
  const product = await getProductDetail(productSlug, locale);

  if (
    !product ||
    product.category.line !== line ||
    product.category.slug !== subcategory
  ) {
    notFound();
  }

  const t = await getTranslations("Shop");
  const inStock = product.quantityOnHand > 0;
  const config = lineConfig(line);
  const basePath = `/${config.slug}`;

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto grid w-full max-w-4xl gap-10 sm:grid-cols-2">
        {product.images.length > 0 ? (
          <ProductGallery
            images={product.images.map((i) => i.url)}
            alt={product.name}
          />
        ) : (
          <div
            className={`flex h-80 items-center justify-center rounded-2xl font-display text-6xl ${config.placeholderClass}`}
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <Link
            href={`${basePath}/${subcategory}`}
            className="text-sm font-medium text-salamander-600 hover:underline"
          >
            {product.category.name}
          </Link>
          <h1 className="font-display text-3xl text-taupe-800">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-taupe-600">{product.description}</p>
          )}
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              inStock
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {inStock ? t("inStock") : t("outOfStock")}
          </span>
          <ProductPurchase
            productId={product.id}
            slug={product.slug}
            categorySlug={subcategory}
            line={line}
            name={product.name}
            priceCents={product.priceCents}
            currency={product.currency}
            inStock={inStock}
            imageUrl={product.images[0]?.url ?? null}
            variants={product.variants}
            hasColorOptions={product.hasColorOptions}
          />
        </div>
      </div>
      {product.longDescription && (
        <div className="mx-auto mt-12 w-full max-w-4xl border-t border-cream-200 pt-10">
          <p className="max-w-2xl leading-relaxed whitespace-pre-line text-taupe-600">
            {product.longDescription}
          </p>
        </div>
      )}
    </div>
  );
}
