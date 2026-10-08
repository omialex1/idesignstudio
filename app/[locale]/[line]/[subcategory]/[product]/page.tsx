import { notFound } from "next/navigation";
import ProductDetailPage from "@/components/shop/ProductDetailPage";
import { lineFromSlug } from "@/lib/lines";
import { getProductDetail } from "@/lib/db/products";
import type { Metadata } from "next";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}): Promise<Metadata> {
  const { locale, product } = await params;
  const detail = await getProductDetail(product, locale);
  if (!detail) return {};
  return {
    title: `${detail.name} | iDesignStudio.ro`,
    description: detail.description ?? undefined,
  };
}
