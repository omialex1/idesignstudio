import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/client";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";

// Rebuilt at most once an hour, so new products show up without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  // One entry per page and language, each pointing at its translations.
  const entry = (
    path: string,
    lastModified: Date | undefined,
    priority: number,
  ): MetadataRoute.Sitemap =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified,
      priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}/${l}${path}`]),
        ),
      },
    }));

  const [mains, categories, products] = await Promise.all([
    prisma.mainCategory.findMany({
      where: { categories: { some: { products: { some: { isActive: true } } } } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { mainCategoryId: { not: null } },
      select: { slug: true, updatedAt: true, mainCategory: { select: { slug: true } } },
    }),
    prisma.product.findMany({
      where: { isActive: true, category: { mainCategoryId: { not: null } } },
      select: {
        slug: true,
        updatedAt: true,
        category: { select: { slug: true, mainCategory: { select: { slug: true } } } },
      },
    }),
  ]);

  return [
    ...entry("", undefined, 1),
    ...mains.flatMap((m) => entry(`/${m.slug}`, m.updatedAt, 0.8)),
    ...categories.flatMap((c) =>
      entry(`/${c.mainCategory!.slug}/${c.slug}`, c.updatedAt, 0.7),
    ),
    ...products.flatMap((p) =>
      entry(
        `/${p.category.mainCategory!.slug}/${p.category.slug}/${p.slug}`,
        p.updatedAt,
        0.9,
      ),
    ),
    ...["terms", "privacy", "withdrawal"].flatMap((page) =>
      entry(`/${page}`, undefined, 0.3),
    ),
  ];
}
