import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductDetail, getRecommendedProducts } from "@/lib/db/products";
import { shortName } from "@/components/product/ProductTile";
import RecommendedStrip from "@/components/product/RecommendedStrip";
import { getPaletteColors } from "@/lib/db/colors";
import { categoryColorClass } from "@/lib/category-colors";
import ProductPurchase from "@/components/product/ProductPurchase";
import ProductGallery from "@/components/product/ProductGallery";
import { COMPANY, shortText, siteUrl } from "@/lib/seo";
import { renderRichText } from "@/lib/rich-text";
import Reveal from "@/components/layout/Reveal";
import { calculateShippingCents } from "@/lib/shipping";
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
  // Colours are only offered in categories that use them (3D-printed items).
  const colors =
    main.usesColors && product.hasColorOptions
      ? await getPaletteColors(main.id, product.excludedColors)
      : [];
  const inStock = product.quantityOnHand > 0;
  const basePath = `/${main.slug}`;

  // Structured data so search engines can show price and availability.
  const url = `${siteUrl()}/${locale}${basePath}/${subcategory}/${product.slug}`;
  const availability = `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`;
  const prices = product.tieredPricing
    ? product.tiers.map((t) => t.priceCents)
    : product.variants.length
      ? product.variants.map((v) => v.priceCents)
      : [product.priceCents];
  const money = (cents: number) => (cents / 100).toFixed(2);
  // Mirrors the Terms: 14-day withdrawal, customer pays the return shipping.
  const returnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "RO",
    returnPolicyCategory:
      "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    merchantReturnLink: `${siteUrl()}/${locale}/terms`,
  };
  // Same rule as the checkout: flat fee, free from the threshold. Delivery
  // times follow the Terms (1-2 working days production + 1-2 days courier).
  const shippingDetails = {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: money(calculateShippingCents(Math.min(...prices))),
      currency: product.currency,
    },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "RO" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 2,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 2,
        unitCode: "DAY",
      },
    },
  };
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: shortText(product.description, 300),
    image: product.images.map((i) => `${siteUrl()}${i.url}`),
    // Google accepts at most 50 characters in sku
    sku: product.slug.slice(0, 50).replace(/-+$/, ""),
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
            hasMerchantReturnPolicy: returnPolicy,
            shippingDetails,
          }
        : {
            "@type": "Offer",
            priceCurrency: product.currency,
            price: money(prices[0]),
            availability,
            itemCondition: "https://schema.org/NewCondition",
            url,
            hasMerchantReturnPolicy: returnPolicy,
            shippingDetails,
          },
  };

  const recommended = await getRecommendedProducts(product.id, locale);

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
            hasColorOptions={colors.length > 0}
            colors={colors}
            components={product.components}
            tiers={product.tiers}
            availableQuantity={product.availableQuantity}
          />
        </div>
      </div>
      {recommended.length > 0 && (
        <div className="mx-auto mt-8 w-full max-w-4xl">
          <RecommendedStrip
            title={t("goesWith")}
            prevLabel={t("previous")}
            nextLabel={t("next")}
            items={recommended.map((p) => ({
              id: p.id,
              href: p.href,
              name: shortName(p.name),
              imageUrl: p.imageUrl,
              placeholderClass: categoryColorClass(p.mainColorKey),
              note: p.inStock ? undefined : t("outOfStock"),
              shuffle: p.shuffled,
            }))}
          />
        </div>
      )}
      {product.longDescription && (
        <Reveal className="mx-auto mt-12 w-full max-w-4xl border-t border-cream-200 pt-10">
          <p className="max-w-2xl leading-relaxed whitespace-pre-line text-taupe-600">
            {renderRichText(product.longDescription)}
          </p>
        </Reveal>
      )}
    </div>
  );
}
