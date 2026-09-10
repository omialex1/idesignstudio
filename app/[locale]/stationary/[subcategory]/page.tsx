import CategoryDetailPage from "@/components/shop/CategoryDetailPage";

export default async function StationarySubcategoryPage({
  params,
}: {
  params: Promise<{ locale: string; subcategory: string }>;
}) {
  const { locale, subcategory } = await params;
  return (
    <CategoryDetailPage
      line="STATIONARY"
      subcategory={subcategory}
      locale={locale}
    />
  );
}
