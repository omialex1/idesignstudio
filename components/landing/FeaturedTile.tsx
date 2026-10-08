import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { lineConfig } from "@/lib/lines";
import type { FeaturedProduct } from "@/lib/db/products";
import type { ProductLine } from "@/lib/generated/prisma";

export default function FeaturedTile({
  product,
  line,
  locale,
}: {
  product: FeaturedProduct;
  line: ProductLine;
  locale: string;
}) {
  const t = useTranslations("Shop");
  const config = lineConfig(line);

  return (
    <Link
      href={`/${config.slug}/${product.categorySlug}/${product.slug}`}
      className="group flex flex-col items-center gap-2 text-center"
    >
      <span className="text-sm font-medium text-taupe-800 group-hover:text-salamander-600">
        {product.name}
      </span>
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="aspect-[4/5] w-full rounded-xl border border-salamander-200 object-cover"
        />
      ) : (
        <div
          className={`flex aspect-[4/5] w-full items-center justify-center rounded-xl font-display text-3xl ${config.placeholderClass}`}
        >
          {product.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-sm text-taupe-600">
        {product.hasVariants
          ? t("fromPrice", {
              price: formatPrice(product.priceCents, product.currency, locale),
            })
          : formatPrice(product.priceCents, product.currency, locale)}
      </span>
    </Link>
  );
}
