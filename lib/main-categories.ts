import { cache } from "react";
import { prisma } from "@/lib/db/client";

// A top-level category (Events, Handmade, ...), translated for one locale.
export type MainCategory = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  colorKey: string;
};

type Row = {
  id: string;
  slug: string;
  color: string;
  translations: {
    locale: string;
    name: string;
    headline: string | null;
    description: string | null;
  }[];
};

function localize(row: Row, locale: string): MainCategory {
  const t =
    row.translations.find((x) => x.locale === locale) ??
    row.translations.find((x) => x.locale === "ro");
  return {
    id: row.id,
    slug: row.slug,
    name: t?.name ?? row.slug,
    headline: t?.headline ?? null,
    description: t?.description ?? null,
    colorKey: row.color,
  };
}

// In menu order. Memoized per request, so the layout, header and page share one query.
export const getMainCategories = cache(
  async (locale: string): Promise<MainCategory[]> => {
    const rows = await prisma.mainCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { translations: true },
    });
    return rows.map((r) => localize(r, locale));
  },
);

export async function getMainCategoryBySlug(
  slug: string,
  locale: string,
): Promise<MainCategory | null> {
  const row = await prisma.mainCategory.findUnique({
    where: { slug },
    include: { translations: true },
  });
  return row ? localize(row, locale) : null;
}

// URL segments that already belong to other pages, so a main category cannot
// take them.
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "account",
  "cart",
  "checkout",
  "terms",
  "privacy",
  "withdrawal",
  "sitemap.xml",
  "robots.txt",
  "icon.png",
  "favicon.ico",
];
