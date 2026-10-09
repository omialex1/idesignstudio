// Price a customer pays for a variant: the variant's price minus its optional
// percentage discount (used for sets). Always whole bani.
export const MAX_DISCOUNT_PERCENT = 90;

export function finalPriceCents(priceCents: number, discountPercent: number) {
  if (!discountPercent) return priceCents;
  return Math.round((priceCents * (100 - discountPercent)) / 100);
}
