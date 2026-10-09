import { notFound } from "next/navigation";
import ProductDetailPage from "@/components/shop/ProductDetailPage";
import { lineFromSlug } from "@/lib/lines";
import { getProductDetail } from "@/lib/db/products";
import { pageAlternates, shortText } from "@/lib/seo";
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
  params: Promise<{
    locale: string;
    line: string;
    subcategory: string;
    product: string;
  }>;
}): Promise<Metadata> {
  const { locale, line, subcategory, product } = await params;
  const detail = await getProductDetail(product, locale);
  const config = lineFromSlug(line);
  if (!detail || !config) return {};
  const description = shortText(detail.description);
  const photo = detail.images[0]?.url;
  return {
    title: detail.name,
    description,
    alternates: pageAlternates(
      locale,
      `/${config.slug}/${subcategory}/${detail.slug}`,
    ),
    openGraph: {
      type: "website",
      siteName: "iDesignStudio.ro",
      locale: locale === "en" ? "en_GB" : "ro_RO",
      title: detail.name,
      description,
      images: photo ? [{ url: photo, alt: detail.name }] : undefined,
    },
    twitter: { title: detail.name, description },
  };
}
