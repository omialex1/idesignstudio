import { sortTiers, type PriceTier } from "@/lib/tiers";
import { prisma } from "@/lib/db/client";
import { variantPricing } from "@/lib/pricing";
import { promoForProduct, promoPrices, type PromoPrice } from "@/lib/discounts";
import { pricePointsOf } from "@/lib/price-history";
import type { ProductPromo } from "@/lib/discount-math";

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
  createdAt: string;
  hasColorOptions: boolean;
  excludedColors: string[];
  // a group discount that is switched on (see lib/discounts.ts)
  promo?: PromoPrice | null;
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
    createdAt: Date;
    hasColorOptions: boolean;
    excludedColors: string[];
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
    createdAt: product.createdAt.toISOString(),
    hasColorOptions: product.hasColorOptions,
    excludedColors: product.excludedColors,
  };
}

// Adds the discount of the groups (when switched on) to a list of products.
async function withPromos<T extends { id: string; priceCents: number }>(
  products: T[],
): Promise<(T & { promo: PromoPrice | null })[]> {
  const promos = await promoPrices(products).catch(
    () => new Map<string, PromoPrice>(),
  );
  return products.map((p) => ({ ...p, promo: promos.get(p.id) ?? null }));
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
    // alphabetical by the name shown, so the list is the same on every visit
    products: await withPromos(
      category.products
        .map((p) => translateProduct(p, locale))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    ),
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

  // Tiered products (e.g. invitations): the "variants" are price tiers that the
  // customer reads but does not pick.
  const tiers: PriceTier[] = product.tieredPricing
    ? sortTiers(
        product.variants
          .filter((v) => v.minQuantity !== null)
          .map((v) => ({
            minQuantity: v.minQuantity as number,
            priceCents: v.priceCents,
          })),
      )
    : [];

  // the discount of the product's groups, when one is switched on (never for
  // products priced by quantity)
  const promo: ProductPromo | null = product.tieredPricing
    ? null
    : await promoForProduct(product.id, pricePointsOf(product)).catch(() => null);

  return {
    ...translateProduct(product, locale),
    promo,
    images: product.images,
    hasColorOptions: product.hasColorOptions,
    excludedColors: product.excludedColors,
    tieredPricing: product.tieredPricing && tiers.length > 0,
    tiers,
    availableQuantity: Math.max(
      0,
      (product.inventory?.quantityOnHand ?? 0) -
        (product.inventory?.reservedQty ?? 0),
    ),
    // Pieces of a product without variants (variants carry their own).
    components: product.components
      .filter((c) => !c.variantId)
      .map((c) => toPiece(c, locale)),
    variants: (product.tieredPricing ? [] : product.variants).map((v, i, all) => ({
      id: v.id,
      name: locale === "en" ? (v.nameEn ?? v.nameRo) : v.nameRo,
      // What the customer pays, after the variant's discount.
      priceCents: variantPricing(all)[i].finalCents,
      fullPriceCents: variantPricing(all)[i].fullCents,
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
  promo: PromoPrice | null;
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

  const promos = await promoPrices(products).catch(
    () => new Map<string, PromoPrice>(),
  );
  return products.map((p) => {
    const translation =
      p.translations.find((t) => t.locale === locale) ??
      p.translations.find((t) => t.locale === "ro");
    return {
      id: p.id,
      slug: p.slug,
      categorySlug: p.category.slug,
      promo: promos.get(p.id) ?? null,
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

export type RecommendedProduct = {
  id: string;
  href: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  hasVariants: boolean;
  inStock: boolean;
  mainColorKey: string;
  // comes from a group set to a random order (mixed in the browser)
  shuffled: boolean;
};

// The products of the "Merge bine cu" groups this product is in, in the order set
// in the groups (a product in several groups: no repeats). Only active products.
export async function getRecommendedProducts(
  productId: string,
  locale: string,
): Promise<RecommendedProduct[]> {
  const groups = await prisma.productGroup.findMany({
    where: {
      // groups of a kind shown to customers (before kinds existed: "recommended")
      OR: [{ type: { showOnSite: true } }, { typeId: null, kind: "recommended" }],
      items: { some: { productId } },
    },
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: {
              translations: true,
              inventory: { select: { quantityOnHand: true } },
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
              variants: { select: { id: true } },
              category: {
                include: { mainCategory: { select: { slug: true, color: true } } },
              },
            },
          },
        },
      },
    },
  });

  const seen = new Set<string>([productId]);
  const result: RecommendedProduct[] = [];
  const byId = new Map<string, RecommendedProduct>();
  for (const group of groups) {
    for (const { product: p } of group.items) {
      if (!p.isActive || !p.category.mainCategory) continue;
      // in a fixed-order group as well: it keeps its place there
      if (seen.has(p.id)) {
        if (!group.shuffle) {
          const known = byId.get(p.id);
          if (known) known.shuffled = false;
        }
        continue;
      }
      seen.add(p.id);
      const translation =
        p.translations.find((t) => t.locale === locale) ??
        p.translations.find((t) => t.locale === "ro");
      const item: RecommendedProduct = {
        id: p.id,
        href: `/${p.category.mainCategory.slug}/${p.category.slug}/${p.slug}`,
        name: translation?.name ?? p.slug,
        priceCents: p.priceCents,
        currency: p.currency,
        imageUrl: p.images[0]?.url ?? null,
        hasVariants: p.variants.length > 0,
        inStock: (p.inventory?.quantityOnHand ?? 0) > 0,
        mainColorKey: p.category.mainCategory.color,
        shuffled: group.shuffle,
      };
      byId.set(p.id, item);
      result.push(item);
    }
  }
  // fixed-order products first, in their order; the mixed ones after them
  return [...result.filter((r) => !r.shuffled), ...result.filter((r) => r.shuffled)];
}
