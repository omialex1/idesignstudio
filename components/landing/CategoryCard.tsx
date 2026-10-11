import { getTranslations } from "next-intl/server";
import { categoryColorClass } from "@/lib/category-colors";
import ProductTile from "@/components/product/ProductTile";
import type { CategoryWithTranslation } from "@/lib/db/categories";
import type { MainCategory } from "@/lib/main-categories";

export default async function CategoryCard({
  category,
  main,
}: {
  category: CategoryWithTranslation;
  main: MainCategory;
}) {
  const tHome = await getTranslations("Home");

  return (
    <ProductTile
      href={`/${main.slug}/${category.slug}`}
      name={category.name}
      imageUrl={category.imageUrl}
      placeholderClass={categoryColorClass(main.colorKey)}
      eyebrow={main.name}
      description={category.description}
      cta={tHome("viewCollection")}
    />
  );
}
