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
  imageUrl: string | null;
};

function translateProduct(
  product: {
    id: string;
    slug: string;
    priceCents: number;
    currency: string;
    translations: { locale: string; name: string; description: string | null }[];
    inventory: { quantityOnHand: number } | null;
    images?: { url: string }[];
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
    imageUrl: product.images?.[0]?.url ?? null,
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
        include: {
          translations: true,
          inventory: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
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

export type FeaturedProduct = {
  id: string;
  slug: string;
  categorySlug: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
};

// Newest active products of a line, for the homepage sections.
export async function getFeaturedProductsByLine(
  line: ProductLine,
  locale: string,
  take = 4,
): Promise<FeaturedProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, category: { line } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      translations: true,
      category: { select: { slug: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  return products.map((p) => {
    const translation =
      p.translations.find((t) => t.locale === locale) ??
      p.translations.find((t) => t.locale === "ro");
    return {
      id: p.id,
      slug: p.slug,
      categorySlug: p.category.slug,
      name: translation?.name ?? p.slug,
      priceCents: p.priceCents,
      currency: p.currency,
      imageUrl: p.images[0]?.url ?? null,
    };
  });
}

// First product photo found in a line, used as the line's tile image.
export async function getLineImageUrl(line: ProductLine) {
  const image = await prisma.productImage.findFirst({
    where: { product: { isActive: true, category: { line } } },
    orderBy: { sortOrder: "asc" },
    select: { url: true },
  });
  return image?.url ?? null;
}
