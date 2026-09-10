import CategoryIndexPage from "@/components/shop/CategoryIndexPage";

export default async function StationaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <CategoryIndexPage line="STATIONARY" locale={locale} />;
}
