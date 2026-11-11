// What a product card needs to offer "add to favorites" and "add to cart" without
// opening the product page.

export type CardProduct = {
  id: string;
  // the page of the product
  href: string;
  // the full name (kept in the cart line)
  name: string;
  slug: string;
  categorySlug: string;
  mainSlug: string;
  colorKey: string;
  imageUrl: string | null;
  // the price to pay (after a discount, when one is live)
  priceCents: number;
  // with a discount: the price before it, the percent off and the kind's name
  oldPriceCents?: number | null;
  percentOff?: number;
  promoLabel?: string | null;
  currency: string;
  // true: the cart button adds the product at once; false: it opens the product
  // page (variants, colours to choose, or out of stock)
  quickAdd: boolean;
};

// A product goes straight into the cart only when there is nothing to choose:
// no variants (price tiers by quantity count as variants), no colours to pick,
// and it is in stock.
export function canQuickAdd(
  product: { hasVariants: boolean; hasColorOptions: boolean; inStock: boolean },
  mainUsesColors: boolean,
): boolean {
  return (
    product.inStock &&
    !product.hasVariants &&
    !(mainUsesColors && product.hasColorOptions)
  );
}
