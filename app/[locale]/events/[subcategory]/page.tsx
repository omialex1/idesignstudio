import CategoryDetailPage from "@/components/shop/CategoryDetailPage";

export default async function EventsSubcategoryPage({
  params,
}: {
  params: Promise<{ locale: string; subcategory: string }>;
}) {
  const { locale, subcategory } = await params;
  return (
    <CategoryDetailPage line="EVENTS" subcategory={subcategory} locale={locale} />
  );
}
