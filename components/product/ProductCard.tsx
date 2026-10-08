import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { lineConfig } from "@/lib/lines";
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
  const config = lineConfig(line);
  const basePath = `/${config.slug}`;
  const inStock = product.quantityOnHand > 0;

  return (
    <Link
      href={`${basePath}/${categorySlug}/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white transition-shadow hover:shadow-lg"
    >
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div
          className={`flex aspect-square items-center justify-center font-display text-3xl ${config.placeholderClass}`}
        >
          {product.name.charAt(0).toUpperCase()}
        </div>
      )}
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
            {product.hasVariants
              ? t("fromPrice", {
                  price: formatPrice(product.priceCents, product.currency, locale),
                })
              : formatPrice(product.priceCents, product.currency, locale)}
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
