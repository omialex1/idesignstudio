import type { CategoryWithTranslation } from "@/lib/db/categories";
import type { MainCategory } from "@/lib/main-categories";
import CategoryCard from "./CategoryCard";
import Reveal from "@/components/layout/Reveal";

export default function CategoryFeed({
  categories,
  main,
}: {
  categories: CategoryWithTranslation[];
  main: MainCategory;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
        {categories.map((category, i) => (
          <Reveal key={category.id} index={i % 3}>
            <CategoryCard category={category} main={main} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
