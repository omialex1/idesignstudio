import { notFound } from "next/navigation";
import CategoryIndexPage from "@/components/shop/CategoryIndexPage";
import { getMainCategoryBySlug } from "@/lib/main-categories";
import { pageAlternates } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; line: string }>;
}): Promise<Metadata> {
  const { locale, line } = await params;
  const main = await getMainCategoryBySlug(line, locale);
  if (!main) return {};
  return {
    title: main.name,
    description: main.description ?? undefined,
    alternates: pageAlternates(locale, `/${main.slug}`),
  };
}

export default async function MainCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; line: string }>;
}) {
  const { locale, line } = await params;
  const main = await getMainCategoryBySlug(line, locale);
  if (!main) notFound();
  return <CategoryIndexPage main={main} locale={locale} />;
}
