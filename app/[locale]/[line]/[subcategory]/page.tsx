import { notFound } from "next/navigation";
import CategoryDetailPage from "@/components/shop/CategoryDetailPage";
import { getMainCategoryBySlug } from "@/lib/main-categories";
import { getProductsByCategorySlug } from "@/lib/db/products";
import { pageAlternates, shortText } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; line: string; subcategory: string }>;
}): Promise<Metadata> {
  const { locale, line, subcategory } = await params;
  const main = await getMainCategoryBySlug(line, locale);
  if (!main) return {};
  const category = await getProductsByCategorySlug(main.id, subcategory, locale);
  if (!category) return {};
  return {
    title: category.name,
    description: shortText(category.description) ?? undefined,
    alternates: pageAlternates(locale, `/${main.slug}/${category.slug}`),
  };
}

export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ locale: string; line: string; subcategory: string }>;
}) {
  const { locale, line, subcategory } = await params;
  const main = await getMainCategoryBySlug(line, locale);
  if (!main) notFound();
  return (
    <CategoryDetailPage
      main={main}
      subcategory={subcategory}
      locale={locale}
    />
  );
}
