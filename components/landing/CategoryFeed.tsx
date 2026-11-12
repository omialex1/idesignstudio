import { getTranslations } from "next-intl/server";
import { categoryColorClass } from "@/lib/category-colors";
import SubcategoryCard from "@/components/landing/SubcategoryCard";
import Reveal from "@/components/layout/Reveal";
import type { SubcategoryShowcase } from "@/lib/db/products";
import type { MainCategory } from "@/lib/main-categories";

// The subcategories of a main category: small cards, 5 per row on desktop. The photo
// on each is one of its products, chosen at random (see SubcategoryCard). A new
// subcategory with products shows up here by itself.
export default async function CategoryFeed({
  subcategories,
  main,
}: {
  subcategories: SubcategoryShowcase[];
  main: MainCategory;
}) {
  if (subcategories.length === 0) return null;
  const t = await getTranslations("Home");

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {subcategories.map((sub, i) => (
          <Reveal key={sub.id} index={i % 5} className="h-full">
            <SubcategoryCard
              href={`/${main.slug}/${sub.slug}`}
              name={sub.name}
              countLabel={t("productCount", { count: sub.count })}
              cta={t("viewCollection")}
              images={sub.images}
              placeholderClass={categoryColorClass(main.colorKey)}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
