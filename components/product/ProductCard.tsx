import { getTranslations } from "next-intl/server";
import { formatPrice } from "@/lib/format";
import { categoryColorClass } from "@/lib/category-colors";
import ProductTile, { shortName } from "@/components/product/ProductTile";
import type { ProductWithTranslation } from "@/lib/db/products";
import type { MainCategory } from "@/lib/main-categories";

export default async function ProductCard({
  product,
  main,
  categorySlug,
  locale,
}: {
  product: ProductWithTranslation;
  main: Pick<MainCategory, "slug" | "colorKey">;
  categorySlug: string;
  locale: string;
}) {
  const t = await getTranslations("Shop");
  const inStock = product.quantityOnHand > 0;
  const price = formatPrice(product.priceCents, product.currency, locale);

  return (
    <ProductTile
      href={`/${main.slug}/${categorySlug}/${product.slug}`}
      name={shortName(product.name)}
      imageUrl={product.imageUrl}
      placeholderClass={categoryColorClass(main.colorKey)}
      priceLabel={product.hasVariants ? t("fromPrice", { price }) : price}
      note={inStock ? undefined : t("outOfStock")}
    />
  );
}
