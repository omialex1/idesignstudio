// Price a customer pays for a variant: the variant's price minus its optional
// percentage discount (used for sets). Always whole bani.
export const MAX_DISCOUNT_PERCENT = 90;

export function finalPriceCents(priceCents: number, discountPercent: number) {
  if (!discountPercent) return priceCents;
  return Math.round((priceCents * (100 - discountPercent)) / 100);
}

// A variant with a discount is a set (e.g. large + small): its full price is the
// sum of the prices of the other, undiscounted variants, and the discount is
// taken off that sum. Without other variants it falls back to its own price.
// One function used by the shop page, the checkout and the admin, so the price
// shown, charged and saved can never disagree.
export function variantPricing(
  variants: { priceCents: number; discountPercent: number }[],
): { fullCents: number; finalCents: number }[] {
  return variants.map((v, i) => {
    let fullCents = v.priceCents;
    if (v.discountPercent > 0) {
      const others = variants.filter((o, j) => j !== i && !o.discountPercent);
      if (others.length > 0) {
        fullCents = others.reduce((sum, o) => sum + o.priceCents, 0);
      }
    }
    return {
      fullCents,
      finalCents: finalPriceCents(fullCents, v.discountPercent),
    };
  });
}
