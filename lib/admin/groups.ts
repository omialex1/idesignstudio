import { prisma } from "@/lib/db/client";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { matchesAllWords, queryWords } from "@/lib/search";
import {
  asDiscount,
  ensureGroupTypes,
  type GroupTypeInfo,
} from "@/lib/admin/group-types";

// Groups of products ("Merge bine cu" and promotional). Shared by the API routes
// of the Groups window and by the product form.

export const MAX_GROUP_NAME = 80;

export type GroupProduct = {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  stock: number;
  priceCents: number;
  imageUrl: string | null;
  // short description (for the "i" frame) and the full one (for Compare)
  description: string;
  longDescription: string;
  isActive: boolean;
  // the product page on the site
  siteHref: string;
};

export type GroupSummary = {
  id: string;
  name: string;
  type: GroupTypeInfo;
  discountPercent: number | null;
  maxItems: number | null;
  count: number;
  photos: string[];
};

// Only a signed-in admin with two-step login set up may use these.
export async function groupsAdmin() {
  const admin = await getCurrentAdmin();
  return admin && admin.twoFactorEnabled ? admin : null;
}

// The kind picked for a group (falls back to the first kind) and the discount
// that goes with it: only kinds with a discount keep one.
export async function resolveType(
  typeId: unknown,
  discount: unknown,
): Promise<{ type: GroupTypeInfo; discountPercent: number | null }> {
  await ensureGroupTypes();
  const types = await prisma.productGroupType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const type = types.find((t) => t.id === typeId) ?? types[0];
  return {
    type: {
      id: type.id,
      name: type.name,
      showOnSite: type.showOnSite,
      hasDiscount: type.hasDiscount,
    },
    discountPercent: type.hasDiscount ? asDiscount(discount) : null,
  };
}

const typeInfo = (
  t: { id: string; name: string; showOnSite: boolean; hasDiscount: boolean } | null,
): GroupTypeInfo =>
  t
    ? { id: t.id, name: t.name, showOnSite: t.showOnSite, hasDiscount: t.hasDiscount }
    : { id: "", name: "—", showOnSite: false, hasDiscount: false };

export function asMax(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 && n < 10000
    ? n
    : null;
}

type ProductRow = Awaited<ReturnType<typeof loadProducts>>[number];

function loadProducts(where?: { id?: { in: string[] } }) {
  return prisma.product.findMany({
    where,
    include: {
      translations: true,
      inventory: { select: { quantityOnHand: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      category: {
        include: {
          translations: true,
          mainCategory: { select: { slug: true } },
        },
      },
    },
  });
}

const plain = (text: string | null | undefined) =>
  (text ?? "").replace(/\*\*?/g, "").trim();

function toGroupProduct(p: ProductRow): GroupProduct {
  const ro = p.translations.find((t) => t.locale === "ro") ?? p.translations[0];
  return {
    id: p.id,
    name: ro?.name ?? p.slug,
    slug: p.slug,
    categoryName:
      p.category.translations.find((t) => t.locale === "ro")?.name ??
      p.category.slug,
    stock: p.inventory?.quantityOnHand ?? 0,
    priceCents: p.priceCents,
    imageUrl: p.images[0]?.url ?? null,
    description: plain(ro?.description).slice(0, 220),
    longDescription: plain(ro?.longDescription ?? ro?.description),
    isActive: p.isActive,
    siteHref: `/ro/${p.category.mainCategory?.slug ?? ""}/${p.category.slug}/${p.slug}`,
  };
}

export async function listGroups(): Promise<GroupSummary[]> {
  await ensureGroupTypes();
  const groups = await prisma.productGroup.findMany({
    orderBy: { name: "asc" },
    include: {
      type: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          product: {
            select: { images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } },
          },
        },
      },
    },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    type: typeInfo(g.type),
    discountPercent: g.discountPercent,
    maxItems: g.maxItems,
    count: g.items.length,
    photos: g.items
      .map((i) => i.product.images[0]?.url)
      .filter((u): u is string => !!u)
      .slice(0, 4),
  }));
}

export async function getGroup(id: string) {
  await ensureGroupTypes();
  const group = await prisma.productGroup.findUnique({
    where: { id },
    include: { type: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!group) return null;
  const rows = await loadProducts({ id: { in: group.items.map((i) => i.productId) } });
  const byId = new Map(rows.map((p) => [p.id, p]));
  return {
    id: group.id,
    name: group.name,
    type: typeInfo(group.type),
    discountPercent: group.discountPercent,
    shuffle: group.shuffle,
    maxItems: group.maxItems,
    items: group.items
      .map((i) => byId.get(i.productId))
      .filter((p): p is ProductRow => !!p)
      .map(toGroupProduct),
  };
}

// Products matching the typed words, plus the categories and subcategories that
// match (for "Adaugă toate").
export async function searchForGroup(query: string) {
  const words = queryWords(query);
  if (words.length === 0) return { products: [], categories: [] };

  const [rows, mains, subs] = await Promise.all([
    loadProducts(),
    prisma.mainCategory.findMany({
      include: { translations: true, categories: { select: { id: true } } },
    }),
    prisma.category.findMany({
      where: { mainCategoryId: { not: null } },
      include: { translations: true, mainCategory: { include: { translations: true } } },
    }),
  ]);

  const products = rows
    .map(toGroupProduct)
    .filter((p) =>
      matchesAllWords(words, `${p.name} ${p.slug} ${p.categoryName}`),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "ro"))
    .slice(0, 30);

  const roName = (t: { locale: string; name: string }[], fallback: string) =>
    t.find((x) => x.locale === "ro")?.name ?? fallback;
  const countIn = (ids: Set<string>) =>
    rows.filter((p) => p.isActive && ids.has(p.categoryId)).length;

  const categories = [
    ...mains
      .map((m) => ({
        id: m.id,
        kind: "main" as const,
        name: roName(m.translations, m.slug),
        count: countIn(new Set(m.categories.map((c) => c.id))),
      }))
      .filter((c) => matchesAllWords(words, c.name)),
    ...subs
      .map((c) => ({
        id: c.id,
        kind: "sub" as const,
        name: roName(c.translations, c.slug),
        count: countIn(new Set([c.id])),
      }))
      .filter((c) => matchesAllWords(words, c.name)),
  ].slice(0, 8);

  return { products, categories };
}

// Active products of a main category or a subcategory (for "Adaugă toate").
export async function productsOfCategory(kind: "main" | "sub", id: string) {
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      category: kind === "main" ? { mainCategoryId: id } : { id },
    },
    include: {
      translations: true,
      inventory: { select: { quantityOnHand: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      category: {
        include: {
          translations: true,
          mainCategory: { select: { slug: true } },
        },
      },
    },
  });
  return rows
    .map(toGroupProduct)
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
}

// Replaces the products of a group, in the order given (unknown ids are skipped).
export async function setGroupItems(groupId: string, productIds: string[]) {
  const unique = productIds.filter((id, i, all) => all.indexOf(id) === i);
  const known = await prisma.product.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  const ok = new Set(known.map((p) => p.id));
  const ordered = unique.filter((id) => ok.has(id));
  await prisma.$transaction([
    prisma.productGroupItem.deleteMany({ where: { groupId } }),
    prisma.productGroupItem.createMany({
      data: ordered.map((productId, sortOrder) => ({ groupId, productId, sortOrder })),
    }),
  ]);
  return ordered.length;
}
