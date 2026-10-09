import { prisma } from "@/lib/db/client";

export type CategoryWithTranslation = {
  id: string;
  slug: string;
  heroImageUrl: string | null;
  name: string;
  description: string | null;
};

// Subcategories of one main category, in the order set in the admin.
export async function getCategoriesByMain(
  mainCategoryId: string,
  locale: string,
): Promise<CategoryWithTranslation[]> {
  const categories = await prisma.category.findMany({
    where: { mainCategoryId },
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
      heroImageUrl: category.heroImageUrl,
      name: translation?.name ?? category.slug,
      description: translation?.description ?? null,
    };
  });
}
