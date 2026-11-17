import { getTranslations } from "next-intl/server";
import { getSubcategoryShowcase } from "@/lib/db/products";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import CategoryFeed from "@/components/landing/CategoryFeed";
import MidBackdrop from "@/components/layout/MidBackdrop";
import type { MainCategory } from "@/lib/main-categories";

export default async function CategoryIndexPage({
  main,
  locale,
}: {
  main: MainCategory;
  locale: string;
}) {
  const subcategories = await getSubcategoryShowcase(main.id, locale);
  const t = await getTranslations("Shop");

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 pt-12 pb-16 text-center">
        <Breadcrumbs
          label={t("breadcrumbLabel")}
          items={[
            { label: t("breadcrumbHome"), href: "/" },
            { label: main.name },
          ]}
          align="center"
          className="mb-8"
        />
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
      <MidBackdrop src="/images/bg-interior.jpg">
        <CategoryFeed subcategories={subcategories} main={main} />
      </MidBackdrop>
    </div>
  );
}
