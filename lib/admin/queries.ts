import { prisma } from "@/lib/db/client";

export async function getDashboardStats() {
  const products = await prisma.product.findMany({ include: { inventory: true } });
  const totalOrders = await prisma.order.count();

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
export async function getSubcategoriesForAdmin() {
  return prisma.category.findMany({
    include: {
      translations: true,
      mainCategory: { include: { translations: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ mainCategory: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
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
  return categories.map((c) => ({
    id: c.id,
    mainCategoryId: c.mainCategoryId!,
    name: c.translations.find((t) => t.locale === "ro")?.name ?? c.slug,
  }));
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

export async function getOrdersForAdmin() {
  return prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}
