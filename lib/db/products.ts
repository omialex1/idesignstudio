import { prisma } from "@/lib/db/client";
import type { ProductLine } from "@/lib/generated/prisma";

export type ProductWithTranslation = {
  id: string;
  slug: string;
  priceCents: number;
  currency: string;
  name: string;
  description: string | null;
  quantityOnHand: number;
};

function translateProduct(
  product: {
    id: string;
    slug: string;
    priceCents: number;
    currency: string;
    translations: { locale: string; name: string; description: string | null }[];
    inventory: { quantityOnHand: number } | null;
  },
  locale: string,
): ProductWithTranslation {
  const translation =
    product.translations.find((t) => t.locale === locale) ??
    product.translations.find((t) => t.locale === "ro");

  return {
    id: product.id,
    slug: product.slug,
    priceCents: product.priceCents,
    currency: product.currency,
    name: translation?.name ?? product.slug,
    description: translation?.description ?? null,
    quantityOnHand: product.inventory?.quantityOnHand ?? 0,
  };
}

export async function getProductsByCategorySlug(
  line: ProductLine,
  categorySlug: string,
  locale: string,
) {
  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, line },
    include: {
      translations: true,
      products: {
        where: { isActive: true },
        include: { translations: true, inventory: true },
      },
    },
  });

  if (!category) return null;

  const categoryTranslation =
    category.translations.find((t) => t.locale === locale) ??
    category.translations.find((t) => t.locale === "ro");

  return {
    id: category.id,
    slug: category.slug,
    line: category.line,
    name: categoryTranslation?.name ?? category.slug,
    description: categoryTranslation?.description ?? null,
    products: category.products.map((p) => translateProduct(p, locale)),
  };
}

export async function getProductDetail(productSlug: string, locale: string) {
  const product = await prisma.product.findFirst({
    where: { slug: productSlug, isActive: true },
    include: {
      translations: true,
      inventory: true,
      images: { orderBy: { sortOrder: "asc" } },
      category: { include: { translations: true } },
    },
  });

  if (!product) return null;

  const categoryTranslation =
    product.category.translations.find((t) => t.locale === locale) ??
    product.category.translations.find((t) => t.locale === "ro");

  return {
    ...translateProduct(product, locale),
    images: product.images,
    category: {
      id: product.category.id,
      slug: product.category.slug,
      line: product.category.line,
      name: categoryTranslation?.name ?? product.category.slug,
    },
  };
}
