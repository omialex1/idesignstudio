import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getVisibleMainCategories } from "@/lib/main-categories";
import { categoryColorClass } from "@/lib/category-colors";
import { getFeaturedProductsByMain, getMainImageUrl } from "@/lib/db/products";
import FeaturedTile from "@/components/landing/FeaturedTile";
import ProductTile from "@/components/product/ProductTile";
import Reveal from "@/components/layout/Reveal";
import { COMPANY, pageAlternates, siteUrl } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates(locale), title: { absolute: (await getTranslations({ locale, namespace: "Metadata" }))("title") } };
}


const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[22px] w-[22px]",
  "aria-hidden": true,
};

// Corner of the photo each box belongs to: centred on the photo's edge, so half
// of it is inside the photo, and always inside the photo's height.
const HERO_POINTS = [
  {
    key: "trustMade",
    position: "md:top-7 md:left-0 md:-translate-x-1/2",
    late: false,
    icon: (
      <svg {...iconProps}>
        <path d="M3 21l3.5-.9L19 7.6a2.1 2.1 0 0 0-3-3L3.9 17 3 21z" />
        <path d="M14.5 6.1l3.4 3.4" />
      </svg>
    ),
  },
  {
    key: "trustColors",
    position: "md:top-7 md:right-0 md:translate-x-1/2",
    late: false,
    icon: (
      <svg {...iconProps}>
        <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.2-.9-1.4-.9-2.4 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
        <circle cx="7.5" cy="11" r=".9" />
        <circle cx="10.5" cy="7.2" r=".9" />
        <circle cx="15" cy="7.4" r=".9" />
      </svg>
    ),
  },
  {
    key: "trustShip",
    position: "md:top-[calc(100%_-_5.75rem)] md:left-0 md:-translate-x-1/2",
    late: true,
    icon: (
      <svg {...iconProps}>
        <path d="M2 6h11v10H2z" />
        <path d="M13 9h4.5l3.5 3.5V16h-8" />
        <circle cx="6.5" cy="17.5" r="1.8" />
        <circle cx="17" cy="17.5" r="1.8" />
      </svg>
    ),
  },
  {
    key: "trustPay",
    position: "md:top-[calc(100%_-_5.75rem)] md:right-0 md:translate-x-1/2",
    late: true,
    icon: (
      <svg {...iconProps}>
        <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.2-7.5 9.5-4.4-1.3-7.5-4.9-7.5-9.5V6L12 3z" />
        <path d="M8.8 12l2.3 2.3 4.2-4.6" />
      </svg>
    ),
  },
] as const;

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const mainCategories = await getVisibleMainCategories(locale);

  const sections = await Promise.all(
    mainCategories.map(async (main) => ({
      main,
      imageUrl: await getMainImageUrl(main.id),
      products: await getFeaturedProductsByMain(main.id, locale),
    })),
  );

  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: COMPANY.brand,
            legalName: COMPANY.name,
            url: siteUrl(),
            email: COMPANY.email,
            telephone: COMPANY.phone,
            address: {
              "@type": "PostalAddress",
              streetAddress: COMPANY.street,
              addressLocality: COMPANY.city,
              addressRegion: COMPANY.region,
              addressCountry: COMPANY.country,
            },
          }),
        }}
      />
      <section className="relative -mt-[68px] overflow-hidden bg-choc">
        {/* soft blurred copy of the photo as the backdrop, fading into the page */}
        <Image
          src="/images/hero-flatlay.jpg"
          alt=""
          fill
          sizes="96px"
          className="scale-125 object-cover blur-2xl brightness-[0.66] contrast-105 saturate-150"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-choc/50 via-choc/25 to-choc/10"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-cream-50"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-[92px] pb-24 sm:px-6 sm:pt-28">
          <h1 className="sr-only">{t("heroTitle")}</h1>

          <div className="relative w-full max-w-[520px]">
            {/* gradient frame: champagne gold fading to terracotta */}
            <div className="hero-rise rounded-[1.75rem] bg-gradient-to-br from-gold-300 via-gold-400 to-salamander-400 p-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="relative aspect-[520/380] overflow-hidden rounded-[calc(1.75rem-3px)]">
                <Image
                  src="/images/hero-flatlay.jpg"
                  alt={t("heroPhotoAlt")}
                  fill
                  priority
                  sizes="(min-width: 640px) 520px, 92vw"
                  className="hero-zoom object-cover object-[50%_32%]"
                />
              </div>
            </div>

            {/* four boxes: on wide screens each one sits half inside a corner of the photo */}
            <ul className="mt-4 grid grid-cols-2 gap-3 md:contents">
              {HERO_POINTS.map((point) => (
                <li
                  key={point.key}
                  className={`${point.late ? "hero-rise-late" : "hero-rise"} flex items-center gap-3 rounded-full border border-gold-400/50 bg-choc/60 py-2 pr-4 pl-2 text-cream-50 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-md md:absolute md:w-[248px] md:py-[11px] md:pr-5 md:pl-[11px] ${point.position}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 text-choc md:h-10 md:w-10">
                    {point.icon}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-[13px] font-semibold md:text-sm">
                      {t(`${point.key}Title`)}
                    </span>
                    <span className="block text-[11px] text-cream-200 md:text-xs">
                      {t(`${point.key}Body`)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="categorii"
        className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-16"
      >
        <Reveal>
          <h2 className="text-center font-display text-4xl text-taupe-800 italic">
            {t("discover")}
          </h2>
          <span
            className="mx-auto mt-3 block h-px w-12 bg-gold-600"
            aria-hidden="true"
          />
        </Reveal>
        <div className="mt-10 flex flex-wrap justify-center gap-5">
          {sections.map(({ main, imageUrl }, i) => (
            <Reveal
              key={main.id}
              index={i}
              className="w-[calc(50%-10px)] sm:w-56"
            >
              <ProductTile
                href={`/${main.slug}`}
                name={main.name}
                imageUrl={imageUrl}
                placeholderClass={categoryColorClass(main.colorKey)}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {sections
        .filter(({ products }) => products.length > 0)
        .map(({ main, products }) => (
          <section
            key={main.id}
            className="mx-auto w-full max-w-5xl px-6 py-12"
          >
            <Reveal>
              <h2 className="text-center font-display text-4xl text-taupe-800 italic">
                {main.name}
              </h2>
              <span
                className="mx-auto mt-3 block h-px w-12 bg-gold-600"
                aria-hidden="true"
              />
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
              {products.map((product, i) => (
                <Reveal key={product.id} index={i % 4}>
                  <FeaturedTile
                    product={product}
                    main={main}
                    locale={locale}
                  />
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-10 text-center">
              <Link
                href={`/${main.slug}`}
                className="inline-block rounded-full bg-gold-400 px-9 py-3 text-xs font-semibold tracking-[0.14em] text-choc uppercase transition-colors hover:bg-gold-300"
              >
                {t("viewMore")}
              </Link>
            </Reveal>
          </section>
        ))}
    </div>
  );
}
