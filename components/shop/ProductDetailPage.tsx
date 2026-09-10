import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductDetail } from "@/lib/db/products";
import { formatPrice } from "@/lib/format";
import AddToCartButton from "@/components/product/AddToCartButton";
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
  const isEvents = line === "EVENTS";
  const basePath = isEvents ? "/events" : "/stationary";

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto grid w-full max-w-4xl gap-10 sm:grid-cols-2">
        <div
          className={`flex h-80 items-center justify-center rounded-2xl font-display text-6xl text-cream-50 ${
            isEvents ? "bg-terracotta-400" : "bg-brown-500"
          }`}
        >
          {product.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col gap-4">
          <Link
            href={`${basePath}/${subcategory}`}
            className="text-sm font-medium text-terracotta-600 hover:underline"
          >
            {product.category.name}
          </Link>
          <h1 className="font-display text-3xl text-brown-800">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-brown-600">{product.description}</p>
          )}
          <p className="font-display text-2xl text-brown-800">
            {formatPrice(product.priceCents, product.currency, locale)}
          </p>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              inStock
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {inStock ? t("inStock") : t("outOfStock")}
          </span>
          <AddToCartButton
            productId={product.id}
            slug={product.slug}
            categorySlug={subcategory}
            line={line}
            name={product.name}
            priceCents={product.priceCents}
            currency={product.currency}
            inStock={inStock}
          />
        </div>
      </div>
    </div>
  );
}
