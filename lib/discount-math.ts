// Price arithmetic of the group discounts, safe to use in the browser too.

// A price after a discount, in whole bani.
export function discountedCents(cents: number, percent: number): number {
  if (!percent) return cents;
  return Math.max(0, Math.round((cents * (100 - percent)) / 100));
}

// What a customer sees for one price: the price he pays, the prior price struck
// through (the lowest price of the 30 days before the reduction began) and the
// percentage counted against that prior price (not against the list price).
export type PriceView = {
  finalCents: number;
  // null when there is nothing to show as a reduction
  priorCents: number | null;
  shownPercent: number;
};

export function priceView(
  regularCents: number,
  percent: number,
  priorCents: number,
): PriceView {
  const finalCents = discountedCents(regularCents, percent);
  if (priorCents <= finalCents) {
    return { finalCents, priorCents: null, shownPercent: 0 };
  }
  return {
    finalCents,
    priorCents,
    shownPercent: Math.round(((priorCents - finalCents) / priorCents) * 100),
  };
}

// The discount of a product as the shop pages receive it.
export type ProductPromo = {
  percent: number;
  // the name of the discount's kind (e.g. "Black Friday") when it is to be shown
  label: string | null;
  // ISO date the discount ends, if it has an end
  endsAt: string | null;
  // prior price by price point (-1: the "from" price, 0..n: the variants)
  priorByKey: Record<number, number>;
};
