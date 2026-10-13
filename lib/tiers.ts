// Quantity price tiers (e.g. invitations): the unit price depends on how many
// pieces are bought. Customers type a quantity; the tier is picked for them.

export type PriceTier = { minQuantity: number; priceCents: number };

export type TierRange = {
  from: number;
  // null for the last, open-ended tier ("200+")
  to: number | null;
  priceCents: number;
};

// Most pieces of one tiered product in one order, and of any other product.
export const TIERED_MAX_QUANTITY = 5000;
export const DEFAULT_MAX_QUANTITY = 20;

export function sortTiers<T extends PriceTier>(tiers: T[]): T[] {
  return [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
}

export function maxQuantityFor(tiers?: PriceTier[] | null): number {
  return tiers && tiers.length > 0 ? TIERED_MAX_QUANTITY : DEFAULT_MAX_QUANTITY;
}

// Smallest order allowed for a tiered product.
export function firstTierMin(tiers: PriceTier[]): number {
  return Math.max(1, sortTiers(tiers)[0]?.minQuantity ?? 1);
}

// The tier a quantity falls in; null when it is below the first tier.
export function tierFor(tiers: PriceTier[], quantity: number): PriceTier | null {
  let found: PriceTier | null = null;
  for (const tier of sortTiers(tiers)) {
    if (quantity >= tier.minQuantity) found = tier;
  }
  return found;
}

// Ranges for display: the first range starts at the smallest allowed order.
export function tierRanges(tiers: PriceTier[]): TierRange[] {
  const sorted = sortTiers(tiers);
  return sorted.map((tier, i) => ({
    from: i === 0 ? Math.max(1, tier.minQuantity) : tier.minQuantity,
    to: i + 1 < sorted.length ? sorted[i + 1].minQuantity - 1 : null,
    priceCents: tier.priceCents,
  }));
}

export function rangeLabel(range: TierRange, locale: string): string {
  const unit = locale === "en" ? "pcs" : "buc";
  return range.to === null
    ? `${range.from}+ ${unit}`
    : range.from === range.to
      ? `${range.from} ${unit}`
      : `${range.from}–${range.to} ${unit}`;
}

// Label of the tier a quantity falls in, e.g. "50–99 buc".
export function tierLabelFor(
  tiers: PriceTier[],
  quantity: number,
  locale: string,
): string | null {
  const tier = tierFor(tiers, quantity);
  if (!tier) return null;
  const range = tierRanges(tiers).find((r) => r.priceCents === tier.priceCents && r.from <= quantity && (r.to === null || quantity <= r.to));
  return range ? rangeLabel(range, locale) : null;
}
