import { prisma } from "@/lib/db/client";

// The kinds of product group. Two exist from the start; more can be added, and
// every name can be changed in the Groups window.
export const MAX_TYPE_NAME = 40;

export type GroupTypeInfo = {
  id: string;
  name: string;
  // customers see the products of these groups as "Merge bine cu"
  showOnSite: boolean;
  // these groups carry a discount in percent
  hasDiscount: boolean;
  // the name of the kind is shown by the price while its discount is live
  showLabel: boolean;
};

export type GroupTypeRow = GroupTypeInfo & { groupCount: number };

// Creates the two starting kinds when there are none, and gives the groups made
// before kinds existed the kind that matches their old setting.
export async function ensureGroupTypes() {
  if ((await prisma.productGroupType.count()) === 0) {
    await prisma.productGroupType.createMany({
      data: [
        { name: "Merge bine cu", showOnSite: true, hasDiscount: false, sortOrder: 0 },
        { name: "Promoțional", showOnSite: false, hasDiscount: true, sortOrder: 1 },
      ],
    });
  }
  const orphans = await prisma.productGroup.findMany({
    where: { typeId: null },
    select: { id: true, kind: true },
  });
  if (orphans.length === 0) return;
  const types = await prisma.productGroupType.findMany({ orderBy: { sortOrder: "asc" } });
  const recommended = types.find((t) => t.showOnSite) ?? types[0];
  const promo = types.find((t) => t.hasDiscount) ?? types[0];
  for (const group of orphans) {
    await prisma.productGroup.update({
      where: { id: group.id },
      data: { typeId: (group.kind === "promo" ? promo : recommended).id },
    });
  }
}

export async function listGroupTypes(): Promise<GroupTypeRow[]> {
  await ensureGroupTypes();
  const types = await prisma.productGroupType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { groups: true } } },
  });
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    showOnSite: t.showOnSite,
    hasDiscount: t.hasDiscount,
    showLabel: t.showLabel,
    groupCount: t._count.groups,
  }));
}

export function cleanTypeName(value: unknown): string | null {
  const name = typeof value === "string" ? value.trim() : "";
  return name && name.length <= MAX_TYPE_NAME ? name : null;
}

// 1..100, or null (no discount)
export function asDiscount(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 100
    ? n
    : null;
}
