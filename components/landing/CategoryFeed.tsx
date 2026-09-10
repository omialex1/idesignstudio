import type { CategoryWithTranslation } from "@/lib/db/categories";
import CategoryCard from "./CategoryCard";

export default function CategoryFeed({
  categories,
}: {
  categories: CategoryWithTranslation[];
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-24">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
