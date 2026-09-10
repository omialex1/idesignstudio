import ProductDetailPage from "@/components/shop/ProductDetailPage";

export default async function EventsProductPage({
  params,
}: {
  params: Promise<{ locale: string; subcategory: string; product: string }>;
}) {
  const { locale, subcategory, product } = await params;
  return (
    <ProductDetailPage
      line="EVENTS"
      subcategory={subcategory}
      product={product}
      locale={locale}
    />
  );
}
