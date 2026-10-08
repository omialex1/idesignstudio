import { notFound } from "next/navigation";
import CategoryDetailPage from "@/components/shop/CategoryDetailPage";
import { lineFromSlug } from "@/lib/lines";

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
