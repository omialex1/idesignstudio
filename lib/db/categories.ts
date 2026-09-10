import { prisma } from "@/lib/db/client";
import type { ProductLine } from "@/lib/generated/prisma";

export type CategoryWithTranslation = {
  id: string;
  slug: string;
  line: ProductLine;
  heroImageUrl: string | null;
  name: string;
  description: string | null;
};

export async function getCategoriesByLine(
  line: ProductLine,
  locale: string,
): Promise<CategoryWithTranslation[]> {
  const categories = await prisma.category.findMany({
    where: { line },
    orderBy: { sortOrder: "asc" },
    include: { translations: true },
  });

  return categories.map((category) => {
    const translation =
      category.translations.find((t) => t.locale === locale) ??
      category.translations.find((t) => t.locale === "ro");

    return {
      id: category.id,
      slug: category.slug,
      line: category.line,
      heroImageUrl: category.heroImageUrl,
      name: translation?.name ?? category.slug,
      description: translation?.description ?? null,
    };
  });
}
