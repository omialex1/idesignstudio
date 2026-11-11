import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import { categoryColorClass } from "@/lib/category-colors";
import ProductTile, { shortName } from "@/components/product/ProductTile";
import ProductActions from "@/components/product/ProductActions";
import { canQuickAdd, type CardProduct } from "@/lib/product-card";
import type { FeaturedProduct } from "@/lib/db/products";
import type { MainCategory } from "@/lib/main-categories";

export default function FeaturedTile({
  product,
  main,
  locale,
}: {
  product: FeaturedProduct;
  main: Pick<MainCategory, "slug" | "colorKey" | "usesColors">;
  locale: string;
}) {
  const t = useTranslations("Shop");
  const promo = product.promo;
  const price = formatPrice(
    promo?.finalCents ?? product.priceCents,
    product.currency,
    locale,
  );

  const href = `/${main.slug}/${product.categorySlug}/${product.slug}`;
  const card: CardProduct = {
    id: product.id,
    href,
    name: product.name,
    slug: product.slug,
    categorySlug: product.categorySlug,
    mainSlug: main.slug,
    colorKey: main.colorKey,
    imageUrl: product.imageUrl,
    priceCents: promo?.finalCents ?? product.priceCents,
    oldPriceCents: promo?.oldCents ?? null,
    percentOff: promo?.percentOff ?? 0,
    promoLabel: promo?.label ?? null,
    currency: product.currency,
    quickAdd: canQuickAdd(product, main.usesColors),
  };

  return (
    <ProductTile
      href={href}
      name={shortName(product.name)}
      imageUrl={product.imageUrl}
      placeholderClass={categoryColorClass(main.colorKey)}
      priceLabel={product.hasVariants ? t("fromPrice", { price }) : price}
      oldPriceLabel={
        promo?.oldCents
          ? formatPrice(promo.oldCents, product.currency, locale)
          : undefined
      }
      note={product.inStock ? undefined : t("outOfStock")}
      actions={<ProductActions product={card} />}
      badge={
        promo?.oldCents && promo.percentOff
          ? `−${promo.percentOff}%${promo.label ? ` · ${promo.label}` : ""}`
          : (promo?.label ?? undefined)
      }
    />
  );
}
