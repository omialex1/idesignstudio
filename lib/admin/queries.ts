import { prisma } from "@/lib/db/client";

export async function getDashboardStats() {
  const products = await prisma.product.findMany({ include: { inventory: true } });
  const totalOrders = await prisma.order.count({
    where: { status: { notIn: ["CANCELED", "FAILED"] } },
  });

  let lowStock = 0;
  let outOfStock = 0;
  for (const p of products) {
    const qty = p.inventory?.quantityOnHand ?? 0;
    const threshold = p.inventory?.lowStockThreshold ?? 5;
    if (qty <= 0) outOfStock++;
    else if (qty <= threshold) lowStock++;
  }

  return {
    totalProducts: products.length,
    lowStock,
    outOfStock,
    totalOrders,
  };
}

export async function getProductsForAdmin() {
  return prisma.product.findMany({
    include: {
      translations: true,
      inventory: true,
      category: { include: { translations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductForEdit(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      translations: true,
      inventory: true,
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
      variants: { orderBy: { sortOrder: "asc" } },
      components: { orderBy: { sortOrder: "asc" } },
    },
  });
}

// Subcategories with their main category and product count.
// Main categories keep their order; the subcategories in each are alphabetical.
export async function getSubcategoriesForAdmin() {
  const rows = await prisma.category.findMany({
    include: {
      translations: true,
      mainCategory: { include: { translations: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ mainCategory: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  const name = (c: (typeof rows)[number]) =>
    c.translations.find((t) => t.locale === "ro")?.name ?? c.slug;
  return rows
    .map((row, position) => ({ row, position }))
    .sort(
      (a, b) =>
        // keeps the order of the main categories (the query's order)
        (a.row.mainCategoryId === b.row.mainCategoryId
          ? 0
          : a.position - b.position) ||
        name(a.row).localeCompare(name(b.row), "ro"),
    )
    .map(({ row }) => row);
}

export async function getSubcategoryForEdit(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { translations: true, _count: { select: { products: true } } },
  });
}

// Subcategories as choices for the product form.
export async function getCategoryOptions() {
  const categories = await prisma.category.findMany({
    where: { mainCategoryId: { not: null } },
    include: { translations: true },
    orderBy: [{ mainCategory: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  return categories
    .map((c) => ({
      id: c.id,
      mainCategoryId: c.mainCategoryId!,
      name: c.translations.find((t) => t.locale === "ro")?.name ?? c.slug,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
}

// The main categories (Evenimente, Handmade, ...) with how many subcategories they hold.
export async function getMainCategoriesForAdmin() {
  return prisma.mainCategory.findMany({
    include: { translations: true, _count: { select: { categories: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getMainCategoryForEdit(id: string) {
  return prisma.mainCategory.findUnique({
    where: { id },
    include: { translations: true, _count: { select: { categories: true } } },
  });
}

export async function getMainCategoryOptions() {
  const mains = await getMainCategoriesForAdmin();
  return mains.map((m) => ({
    id: m.id,
    name: m.translations.find((t) => t.locale === "ro")?.name ?? m.slug,
  }));
}

// Main categories whose products are made in a colour the customer picks.
export async function getColorMainIds(): Promise<string[]> {
  const rows = await prisma.mainCategory.findMany({
    where: { usesColors: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function getOrdersForAdmin() {
  return prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

// The active colours of every main category that uses colours, for the product
// form (which of them this product offers).
export type PaletteOption = {
  slug: string;
  nameRo: string;
  hex: string;
  swatchImage: boolean;
};

export async function getColorPalettesForAdmin(): Promise<
  Record<string, PaletteOption[]>
> {
  const rows = await prisma.color.findMany({
    where: { isActive: true, mainCategory: { usesColors: true } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { slug: true, nameRo: true, hex: true, swatchImage: true, mainCategoryId: true },
  });
  const byMain: Record<string, PaletteOption[]> = {};
  for (const c of rows) {
    (byMain[c.mainCategoryId] ??= []).push({
      slug: c.slug,
      nameRo: c.nameRo,
      hex: c.hex,
      swatchImage: c.swatchImage,
    });
  }
  return byMain;
}
