import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getProductDetail, getRecommendedProducts } from "@/lib/db/products";
import { shortName } from "@/components/product/ProductTile";
import RecommendedStrip from "@/components/product/RecommendedStrip";
import { getPaletteColors } from "@/lib/db/colors";
import { categoryColorClass } from "@/lib/category-colors";
import ProductPurchase from "@/components/product/ProductPurchase";
import ProductGallery from "@/components/product/ProductGallery";
import { COMPANY, shortText, siteUrl } from "@/lib/seo";
import { renderRichText } from "@/lib/rich-text";
import { formatPrice } from "@/lib/format";
import Reveal from "@/components/layout/Reveal";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { isLimitedEdition } from "@/lib/limited-edition";
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

  // the path shown above the photo: Home > main category > subcategory > this product
  const crumbs = [
    { label: t("breadcrumbHome"), href: "/" },
    { label: main.name, href: basePath },
    { label: product.category.name, href: `${basePath}/${subcategory}` },
    { label: shortName(product.name) },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.href
        ? `${siteUrl()}/${locale}${c.href === "/" ? "" : c.href}`
        : url,
    })),
  };

  const recommended = await getRecommendedProducts(product.id, locale);

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Breadcrumbs
        label={t("breadcrumbLabel")}
        items={crumbs}
        className="mx-auto mb-6 w-full max-w-6xl"
      />
      <div className="mx-auto grid w-full max-w-6xl gap-10 sm:grid-cols-2">
        {product.images.length > 0 ? (
          <ProductGallery
            images={product.images.map((i) => i.url)}
            alt={product.name}
            badge={
              isLimitedEdition(subcategory) ? t("limitedEdition") : undefined
            }
          />
        ) : (
          <div
            className={`flex h-80 items-center justify-center rounded-2xl font-display text-6xl ${categoryColorClass(main.colorKey)}`}
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-3xl text-taupe-800">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-taupe-600">{product.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                inStock
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {inStock ? t("inStock") : t("outOfStock")}
            </span>
          </div>
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
            promo={product.promo}
          />
        </div>
      </div>
      {recommended.length > 0 && (
        <div className="mx-auto mt-8 w-full max-w-6xl">
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
              price: (() => {
                const price = formatPrice(p.priceCents, p.currency, locale);
                return p.hasVariants ? t("fromPrice", { price }) : price;
              })(),
              oldPrice: p.oldPriceCents
                ? formatPrice(p.oldPriceCents, p.currency, locale)
                : undefined,
              limitedLabel: isLimitedEdition(p.categorySlug)
                ? t("limitedEdition")
                : undefined,
              badge:
                p.oldPriceCents && p.percentOff
                  ? `−${p.percentOff}%${p.promoLabel ? ` · ${p.promoLabel}` : ""}`
                  : (p.promoLabel ?? undefined),
              card: {
                id: p.id,
                href: p.href,
                name: p.name,
                slug: p.slug,
                categorySlug: p.categorySlug,
                mainSlug: p.mainSlug,
                colorKey: p.mainColorKey,
                imageUrl: p.imageUrl,
                priceCents: p.priceCents,
                oldPriceCents: p.oldPriceCents,
                percentOff: p.percentOff,
                promoLabel: p.promoLabel,
                currency: p.currency,
                quickAdd: p.quickAdd,
              },
              shuffle: p.shuffled,
            }))}
          />
        </div>
      )}
      {product.longDescription && (
        <Reveal className="mx-auto mt-12 w-full max-w-6xl">
          {/* a paper card with a fine double gold frame, the text in one column */}
          <div className="rounded-3xl border border-gold-600/40 bg-paper p-4 shadow-[0_8px_30px_rgba(60,40,25,0.08)] sm:p-10">
            <div className="rounded-2xl border border-gold-600/25 p-5 sm:p-10">
              <h2 className="font-display text-2xl text-taupe-800 sm:text-3xl">
                {t("aboutProduct")}
              </h2>
              <span
                className="mt-2 mb-5 block h-px w-12 bg-gold-600"
                aria-hidden="true"
              />
              <p className="leading-relaxed whitespace-pre-line text-taupe-600 sm:text-lg">
                {renderRichText(product.longDescription)}
              </p>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
