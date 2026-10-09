import { prisma } from "@/lib/db/client";
import { finalPriceCents } from "@/lib/pricing";

export type ProductWithTranslation = {
  id: string;
  slug: string;
  priceCents: number;
  currency: string;
  name: string;
  description: string | null;
  longDescription: string | null;
  quantityOnHand: number;
  imageUrl: string | null;
  // True when the price is the cheapest of several variants.
  hasVariants: boolean;
};

function translateProduct(
  product: {
    id: string;
    slug: string;
    priceCents: number;
    currency: string;
    translations: {
      locale: string;
      name: string;
      description: string | null;
      longDescription: string | null;
    }[];
    inventory: { quantityOnHand: number } | null;
    images?: { url: string }[];
    variants?: { id: string }[];
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
    longDescription: translation?.longDescription ?? null,
    quantityOnHand: product.inventory?.quantityOnHand ?? 0,
    imageUrl: product.images?.[0]?.url ?? null,
    hasVariants: (product.variants?.length ?? 0) > 0,
  };
}

export async function getProductsByCategorySlug(
  mainCategoryId: string,
  categorySlug: string,
  locale: string,
) {
  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, mainCategoryId },
    include: {
      translations: true,
      products: {
        where: { isActive: true },
        include: {
          translations: true,
          inventory: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: { select: { id: true } },
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
    name: categoryTranslation?.name ?? category.slug,
    description: categoryTranslation?.description ?? null,
    products: category.products.map((p) => translateProduct(p, locale)),
  };
}

function toPiece(
  c: { id: string; nameRo: string; nameEn: string | null; maxColors: number },
  locale: string,
) {
  return {
    id: c.id,
    name: locale === "en" ? (c.nameEn ?? c.nameRo) : c.nameRo,
    maxColors: c.maxColors,
  };
}

export async function getProductDetail(productSlug: string, locale: string) {
  const product = await prisma.product.findFirst({
    where: { slug: productSlug, isActive: true },
    include: {
      translations: true,
      inventory: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
      components: { orderBy: { sortOrder: "asc" } },
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
    hasColorOptions: product.hasColorOptions,
    // Pieces of a product without variants (variants carry their own).
    components: product.components
      .filter((c) => !c.variantId)
      .map((c) => toPiece(c, locale)),
    variants: product.variants.map((v) => ({
      id: v.id,
      name: locale === "en" ? (v.nameEn ?? v.nameRo) : v.nameRo,
      // What the customer pays, after the variant's discount.
      priceCents: finalPriceCents(v.priceCents, v.discountPercent),
      fullPriceCents: v.priceCents,
      discountPercent: v.discountPercent,
      components: product.components
        .filter((c) => c.variantId === v.id)
        .map((c) => toPiece(c, locale)),
    })),
    category: {
      id: product.category.id,
      slug: product.category.slug,
      mainCategoryId: product.category.mainCategoryId,
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
  hasVariants: boolean;
};

// Newest active products of a main category, for the homepage sections.
export async function getFeaturedProductsByMain(
  mainCategoryId: string,
  locale: string,
  take = 4,
): Promise<FeaturedProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, category: { mainCategoryId } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      translations: true,
      category: { select: { slug: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { select: { id: true } },
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
      hasVariants: p.variants.length > 0,
    };
  });
}

// First product photo found in a main category, used as its tile image.
export async function getMainImageUrl(mainCategoryId: string) {
  const image = await prisma.productImage.findFirst({
    where: { product: { isActive: true, category: { mainCategoryId } } },
    orderBy: { sortOrder: "asc" },
    select: { url: true },
  });
  return image?.url ?? null;
}
