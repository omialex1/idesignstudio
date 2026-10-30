import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import { categoryColorClass } from "@/lib/category-colors";
import ProductTile, { shortName } from "@/components/product/ProductTile";
import type { FeaturedProduct } from "@/lib/db/products";
import type { MainCategory } from "@/lib/main-categories";

export default function FeaturedTile({
  product,
  main,
  locale,
}: {
  product: FeaturedProduct;
  main: Pick<MainCategory, "slug" | "colorKey">;
  locale: string;
}) {
  const t = useTranslations("Shop");
  const promo = product.promo;
  const price = formatPrice(
    promo?.finalCents ?? product.priceCents,
    product.currency,
    locale,
  );

  return (
    <ProductTile
      href={`/${main.slug}/${product.categorySlug}/${product.slug}`}
      name={shortName(product.name)}
      imageUrl={product.imageUrl}
      placeholderClass={categoryColorClass(main.colorKey)}
      priceLabel={product.hasVariants ? t("fromPrice", { price }) : price}
      oldPriceLabel={
        promo?.oldCents
          ? formatPrice(promo.oldCents, product.currency, locale)
          : undefined
      }
      badge={
        promo?.oldCents && promo.percentOff
          ? `−${promo.percentOff}%${promo.label ? ` · ${promo.label}` : ""}`
          : (promo?.label ?? undefined)
      }
    />
  );
}
