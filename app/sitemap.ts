import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/client";
import { routing } from "@/i18n/routing";
import { lineSlug, LINES } from "@/lib/lines";
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

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      select: { slug: true, line: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        updatedAt: true,
        category: { select: { slug: true, line: true } },
      },
    }),
  ]);

  return [
    ...entry("", undefined, 1),
    ...LINES.flatMap((l) => entry(`/${l.slug}`, undefined, 0.8)),
    ...categories.flatMap((c) =>
      entry(`/${lineSlug(c.line)}/${c.slug}`, c.updatedAt, 0.7),
    ),
    ...products.flatMap((p) =>
      entry(
        `/${lineSlug(p.category.line)}/${p.category.slug}/${p.slug}`,
        p.updatedAt,
        0.9,
      ),
    ),
    ...["terms", "privacy", "withdrawal"].flatMap((page) =>
      entry(`/${page}`, undefined, 0.3),
    ),
  ];
}
