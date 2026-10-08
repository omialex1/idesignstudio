import { notFound } from "next/navigation";
import ProductDetailPage from "@/components/shop/ProductDetailPage";
import { lineFromSlug } from "@/lib/lines";

export default async function ProductPage({
  params,
}: {
  params: Promise<{
    locale: string;
    line: string;
    subcategory: string;
    product: string;
  }>;
}) {
  const { locale, line, subcategory, product } = await params;
  const config = lineFromSlug(line);
  if (!config) notFound();
  return (
    <ProductDetailPage
      line={config.line}
      subcategory={subcategory}
      product={product}
      locale={locale}
    />
  );
}
