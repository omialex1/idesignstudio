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
    include: { translations: true, inventory: true },
  });
}

export async function getCategoriesForAdmin() {
  return prisma.category.findMany({
    include: { translations: true, _count: { select: { products: true } } },
    orderBy: [{ line: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getCategoryForEdit(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { translations: true },
  });
}

export async function getCategoryOptions() {
  const categories = await prisma.category.findMany({
    include: { translations: true },
    orderBy: [{ line: "asc" }, { sortOrder: "asc" }],
  });
  return categories.map((c) => ({
    id: c.id,
    line: c.line,
    name: c.translations.find((t) => t.locale === "ro")?.name ?? c.slug,
  }));
}

export async function getOrdersForAdmin() {
  return prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}
