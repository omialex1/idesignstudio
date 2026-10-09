import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductDetail } from "@/lib/db/products";
import { categoryColorClass } from "@/lib/category-colors";
import ProductPurchase from "@/components/product/ProductPurchase";
import ProductGallery from "@/components/product/ProductGallery";
import { COMPANY, shortText, siteUrl } from "@/lib/seo";
import { renderRichText } from "@/lib/rich-text";
import type { MainCategory } from "@/lib/main-categories";

export default async function ProductDetailPage({
  main,
  subcategory,
  product: productSlug,
  locale,
}: {
  main: MainCategory;
  subcategory: string;
  product: string;
  locale: string;
}) {
  const product = await getProductDetail(productSlug, locale);

  if (
    !product ||
    product.category.mainCategoryId !== main.id ||
    product.category.slug !== subcategory
  ) {
    notFound();
  }

  const t = await getTranslations("Shop");
  const inStock = product.quantityOnHand > 0;
  const basePath = `/${main.slug}`;

  // Structured data so search engines can show price and availability.
  const url = `${siteUrl()}/${locale}${basePath}/${subcategory}/${product.slug}`;
  const availability = `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`;
  const prices = product.variants.length
    ? product.variants.map((v) => v.priceCents)
    : [product.priceCents];
  const money = (cents: number) => (cents / 100).toFixed(2);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: shortText(product.description, 300),
    image: product.images.map((i) => `${siteUrl()}${i.url}`),
    sku: product.slug,
    brand: { "@type": "Brand", name: COMPANY.brand },
    offers:
      prices.length > 1
        ? {
            "@type": "AggregateOffer",
            priceCurrency: product.currency,
            lowPrice: money(Math.min(...prices)),
            highPrice: money(Math.max(...prices)),
            offerCount: prices.length,
            availability,
            url,
          }
        : {
            "@type": "Offer",
            priceCurrency: product.currency,
            price: money(prices[0]),
            availability,
            itemCondition: "https://schema.org/NewCondition",
            url,
          },
  };

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="mx-auto grid w-full max-w-4xl gap-10 sm:grid-cols-2">
        {product.images.length > 0 ? (
          <ProductGallery
            images={product.images.map((i) => i.url)}
            alt={product.name}
          />
        ) : (
          <div
            className={`flex h-80 items-center justify-center rounded-2xl font-display text-6xl ${categoryColorClass(main.colorKey)}`}
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <Link
            href={`${basePath}/${subcategory}`}
            className="text-sm font-medium text-salamander-600 hover:underline"
          >
            {product.category.name}
          </Link>
          <h1 className="font-display text-3xl text-taupe-800">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-taupe-600">{product.description}</p>
          )}
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              inStock
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {inStock ? t("inStock") : t("outOfStock")}
          </span>
          <ProductPurchase
            productId={product.id}
            slug={product.slug}
            categorySlug={subcategory}
            mainSlug={main.slug}
            colorKey={main.colorKey}
            name={product.name}
            priceCents={product.priceCents}
            currency={product.currency}
            inStock={inStock}
            imageUrl={product.images[0]?.url ?? null}
            variants={product.variants}
            hasColorOptions={product.hasColorOptions}
            components={product.components}
          />
        </div>
      </div>
      {product.longDescription && (
        <div className="mx-auto mt-12 w-full max-w-4xl border-t border-cream-200 pt-10">
          <p className="max-w-2xl leading-relaxed whitespace-pre-line text-taupe-600">
            {renderRichText(product.longDescription)}
          </p>
        </div>
      )}
    </div>
  );
}
