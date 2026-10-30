import { prisma } from "@/lib/db/client";
import { priorPriceCents } from "@/lib/price-history";

// The discounts of the groups, as they apply on the site. A discount is applied
// only when its group (or the product inside the group) was switched on and the
// moment falls inside the group's period (no period: indefinite). A product in
// several groups with a discount gets one: the one the admin chose for it, else
// the biggest. Products priced by quantity (invitations) never get one.

export type ProductDiscount = {
  percent: number;
  groupId: string;
  groupName: string;
  // the name of the group's kind (e.g. "Black Friday"), only when it should be shown
  label: string | null;
  endsAt: Date | null;
  // the moment the reduction started (the prior price is the lowest of the 30 days before)
  referenceAt: Date;
};

// A price after a discount, in whole bani.
export function discountedCents(cents: number, percent: number): number {
  if (!percent) return cents;
  return Math.max(0, Math.round((cents * (100 - percent)) / 100));
}

type Candidate = {
  percent: number;
  groupId: string;
  groupName: string;
  createdAt: Date;
  live: boolean;
  inPeriod: boolean;
  label: string | null;
  endsAt: Date | null;
  referenceAt: Date;
};

// every discount group a product is in (live or not), for the admin
export async function discountCandidates(productIds: string[], now = new Date()) {
  const items = await prisma.productGroupItem.findMany({
    where: {
      productId: { in: productIds },
      group: { type: { hasDiscount: true }, discountPercent: { gt: 0 } },
    },
    select: {
      productId: true,
      live: true,
      group: {
        select: {
          id: true,
          name: true,
          discountPercent: true,
          discountLive: true,
          liveSince: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
          type: { select: { name: true, showLabel: true } },
        },
      },
    },
  });
  const byProduct = new Map<string, Candidate[]>();
  for (const item of items) {
    const g = item.group;
    const started = !g.startsAt || g.startsAt <= now;
    const notEnded = !g.endsAt || g.endsAt > now;
    const live = item.live ?? g.discountLive;
    const candidate: Candidate = {
      percent: g.discountPercent ?? 0,
      groupId: g.id,
      groupName: g.name,
      createdAt: g.createdAt,
      live,
      inPeriod: started && notEnded,
      label: g.type?.showLabel ? g.type.name : null,
      endsAt: g.endsAt,
      referenceAt:
        g.startsAt && g.startsAt <= now ? g.startsAt : (g.liveSince ?? now),
    };
    byProduct.set(item.productId, [
      ...(byProduct.get(item.productId) ?? []),
      candidate,
    ]);
  }
  return byProduct;
}

// The discount in force for each product (products without one are left out).
export async function activeDiscounts(
  productIds: string[],
  now = new Date(),
): Promise<Map<string, ProductDiscount>> {
  const result = new Map<string, ProductDiscount>();
  if (productIds.length === 0) return result;

  const [candidates, products] = await Promise.all([
    discountCandidates(productIds, now),
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, tieredPricing: true, discountGroupId: true },
    }),
  ]);
  for (const product of products) {
    if (product.tieredPricing) continue;
    const live = (candidates.get(product.id) ?? []).filter(
      (c) => c.live && c.inPeriod,
    );
    if (live.length === 0) continue;
    const chosen =
      live.find((c) => c.groupId === product.discountGroupId) ??
      [...live].sort(
        (a, b) =>
          b.percent - a.percent || a.createdAt.getTime() - b.createdAt.getTime(),
      )[0];
    result.set(product.id, {
      percent: chosen.percent,
      groupId: chosen.groupId,
      groupName: chosen.groupName,
      label: chosen.label,
      endsAt: chosen.endsAt,
      referenceAt: chosen.referenceAt,
    });
  }
  return result;
}

// What a customer sees for one price: the price he pays, the prior price struck
// through (the lowest of the 30 days before the reduction) and the percentage
// counted against that prior price.
export type PriceView = {
  finalCents: number;
  priorCents: number;
  // 0 when there is nothing to show as a reduction
  shownPercent: number;
};

export function priceView(
  regularCents: number,
  discount: ProductDiscount,
  priorCents: number,
): PriceView {
  const finalCents = discountedCents(regularCents, discount.percent);
  // never above what the reduction is counted from: the lowest price of the 30 days
  const prior = priorCents;
  const shownPercent =
    prior > finalCents ? Math.round(((prior - finalCents) / prior) * 100) : 0;
  return { finalCents, priorCents: prior, shownPercent };
}

// The prior prices of a product for every price point (key -1: the "from" price,
// 0..n: the variants), from the history.
export async function priorPrices(
  productId: string,
  points: { variantKey: number; priceCents: number }[],
  reference: Date,
): Promise<Record<number, number>> {
  const rows = await prisma.productPriceHistory.findMany({
    where: { productId },
    select: { variantKey: true, priceCents: true, startedAt: true },
  });
  return Object.fromEntries(
    points.map((p) => [
      p.variantKey,
      priorPriceCents(rows, p.variantKey, p.priceCents, reference),
    ]),
  );
}
