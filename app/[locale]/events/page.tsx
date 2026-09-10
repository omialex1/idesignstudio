import CategoryIndexPage from "@/components/shop/CategoryIndexPage";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <CategoryIndexPage line="EVENTS" locale={locale} />;
}
