import { getCategoriesByMain } from "@/lib/db/categories";
import CategoryFeed from "@/components/landing/CategoryFeed";
import type { MainCategory } from "@/lib/main-categories";

export default async function CategoryIndexPage({
  main,
  locale,
}: {
  main: MainCategory;
  locale: string;
}) {
  const categories = await getCategoriesByMain(main.id, locale);

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 py-16 text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-salamander-600 uppercase">
          {main.name}
        </p>
        <h1 className="mt-2 font-display text-4xl text-taupe-800">
          {main.headline ?? main.name}
        </h1>
        {main.description && (
          <p className="mx-auto mt-3 max-w-lg text-taupe-600">
            {main.description}
          </p>
        )}
      </div>
      <CategoryFeed categories={categories} main={main} />
    </div>
  );
}
