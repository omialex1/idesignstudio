import { prisma } from "@/lib/db/client";
import { variantPricing } from "@/lib/pricing";

// History of the prices customers pay. A reduction may only be announced against
// the lowest price of the 30 days before it, so every change of price is noted
// here, with the moment it started.

export const PRIOR_PRICE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PricePoint = { variantKey: number; priceCents: number };

// the "from" price of the product (key -1) and the price of each variant
export function pricePointsOf(product: {
  priceCents: number;
  tieredPricing: boolean;
  variants: { priceCents: number; discountPercent: number | null }[];
}): PricePoint[] {
  const points: PricePoint[] = [
    { variantKey: -1, priceCents: product.priceCents },
  ];
  if (!product.tieredPricing && product.variants.length > 0) {
    const pricing = variantPricing(
      product.variants.map((v) => ({
        priceCents: v.priceCents,
        discountPercent: v.discountPercent ?? 0,
      })),
    );
    pricing.forEach((p, i) =>
      points.push({ variantKey: i, priceCents: p.finalCents }),
    );
  }
  return points;
}

// Notes the prices of a product; only what changed since the last note is added.
export async function recordPrices(productId: string, points: PricePoint[]) {
  try {
    for (const point of points) {
      const last = await prisma.productPriceHistory.findFirst({
        where: { productId, variantKey: point.variantKey },
        orderBy: { startedAt: "desc" },
        select: { priceCents: true },
      });
      if (last && last.priceCents === point.priceCents) continue;
      await prisma.productPriceHistory.create({
        data: {
          productId,
          variantKey: point.variantKey,
          priceCents: point.priceCents,
        },
      });
    }
  } catch (err) {
    // a failed note must never stop the product from being saved
    console.error("Could not record the price history", err);
  }
}

// Notes the current prices of every product (run once to start the history).
export async function snapshotAllPrices() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      priceCents: true,
      tieredPricing: true,
      variants: {
        orderBy: { sortOrder: "asc" },
        select: { priceCents: true, discountPercent: true },
      },
    },
  });
  for (const product of products) {
    await recordPrices(product.id, pricePointsOf(product));
  }
  return products.length;
}

type Row = { variantKey: number; priceCents: number; startedAt: Date };

// The lowest price of the 30 days before `reference` (the moment the reduction
// started). A price counts from the moment it started until the next one; before
// the first note the first price is assumed. Without any note: the current price.
export function priorPriceCents(
  rows: Row[],
  variantKey: number,
  currentCents: number,
  reference: Date,
): number {
  const mine = rows
    .filter((r) => r.variantKey === variantKey)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  if (mine.length === 0) return currentCents;

  const from = reference.getTime() - PRIOR_PRICE_DAYS * DAY_MS;
  const to = reference.getTime();
  // the price in force when the window opened
  let atStart = mine[0].priceCents;
  for (const row of mine) {
    if (row.startedAt.getTime() <= from) atStart = row.priceCents;
  }
  let lowest = atStart;
  for (const row of mine) {
    const t = row.startedAt.getTime();
    if (t > from && t <= to) lowest = Math.min(lowest, row.priceCents);
  }
  return lowest;
}
