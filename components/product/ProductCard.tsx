import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import type { ProductWithTranslation } from "@/lib/db/products";
import type { ProductLine } from "@/lib/generated/prisma";

export default async function ProductCard({
  product,
  line,
  categorySlug,
  locale,
}: {
  product: ProductWithTranslation;
  line: ProductLine;
  categorySlug: string;
  locale: string;
}) {
  const t = await getTranslations("Shop");
  const isEvents = line === "EVENTS";
  const basePath = isEvents ? "/events" : "/stationary";
  const inStock = product.quantityOnHand > 0;

  return (
    <Link
      href={`${basePath}/${categorySlug}/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div
        className={`flex h-40 items-center justify-center font-display text-3xl text-cream-50 ${
          isEvents ? "bg-salamander-400" : "bg-taupe-500"
        }`}
      >
        {product.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg text-taupe-800">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-2 text-sm text-taupe-600">
            {product.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-taupe-800">
            {formatPrice(product.priceCents, product.currency, locale)}
          </span>
          <span
            className={`text-xs font-medium ${
              inStock ? "text-green-700" : "text-red-600"
            }`}
          >
            {inStock ? t("inStock") : t("outOfStock")}
          </span>
        </div>
      </div>
    </Link>
  );
}
