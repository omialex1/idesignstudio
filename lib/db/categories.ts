import { prisma } from "@/lib/db/client";

export type CategoryWithTranslation = {
  id: string;
  slug: string;
  heroImageUrl: string | null;
  // hero image if set, otherwise the first product photo in the category
  imageUrl: string | null;
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

  const photos = await prisma.productImage.findMany({
    where: { product: { isActive: true, category: { mainCategoryId } } },
    orderBy: { sortOrder: "asc" },
    select: { url: true, product: { select: { categoryId: true } } },
  });
  const firstPhoto = new Map<string, string>();
  for (const photo of photos) {
    if (!firstPhoto.has(photo.product.categoryId)) {
      firstPhoto.set(photo.product.categoryId, photo.url);
    }
  }

  return categories.map((category) => {
    const translation =
      category.translations.find((t) => t.locale === locale) ??
      category.translations.find((t) => t.locale === "ro");

    return {
      id: category.id,
      slug: category.slug,
      heroImageUrl: category.heroImageUrl,
      imageUrl: category.heroImageUrl ?? firstPhoto.get(category.id) ?? null,
      name: translation?.name ?? category.slug,
      description: translation?.description ?? null,
    };
  });
}
