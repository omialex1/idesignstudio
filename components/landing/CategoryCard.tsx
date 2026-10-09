import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryColorClass } from "@/lib/category-colors";
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
  const href = `/${main.slug}/${category.slug}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div
        className={`flex h-36 items-center justify-center font-display text-4xl ${categoryColorClass(main.colorKey)}`}
      >
        {category.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-semibold tracking-wide text-salamander-600 uppercase">
          {main.name}
        </span>
        <h3 className="font-display text-lg text-taupe-800">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-sm text-taupe-600">{category.description}</p>
        )}
        <span className="mt-auto pt-2 text-sm font-medium text-salamander-600 group-hover:underline">
          {tHome("viewCollection")}
        </span>
      </div>
    </Link>
  );
}
