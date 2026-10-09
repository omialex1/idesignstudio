import { notFound } from "next/navigation";
import CategoryDetailPage from "@/components/shop/CategoryDetailPage";
import { lineFromSlug } from "@/lib/lines";
import { getProductsByCategorySlug } from "@/lib/db/products";
import { pageAlternates, shortText } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; line: string; subcategory: string }>;
}): Promise<Metadata> {
  const { locale, line, subcategory } = await params;
  const config = lineFromSlug(line);
  if (!config) return {};
  const category = await getProductsByCategorySlug(config.line, subcategory, locale);
  if (!category) return {};
  return {
    title: category.name,
    description: shortText(category.description) ?? undefined,
    alternates: pageAlternates(locale, `/${config.slug}/${category.slug}`),
  };
}

export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ locale: string; line: string; subcategory: string }>;
}) {
  const { locale, line, subcategory } = await params;
  const config = lineFromSlug(line);
  if (!config) notFound();
  return (
    <CategoryDetailPage
      line={config.line}
      subcategory={subcategory}
      locale={locale}
    />
  );
}
