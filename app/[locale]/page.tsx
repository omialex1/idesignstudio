import Image from "next/image";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
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
  if (!hasLocale(routing.locales, locale)) return {};
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

// The four trust points shown under the hero title, one after another.
const HERO_POINTS = [
  {
    key: "trustMade",
    icon: (
      <svg {...iconProps}>
        <path d="M3 21l3.5-.9L19 7.6a2.1 2.1 0 0 0-3-3L3.9 17 3 21z" />
        <path d="M14.5 6.1l3.4 3.4" />
      </svg>
    ),
  },
  {
    key: "trustColors",
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
      <section className="relative -mt-[68px] overflow-hidden bg-cream-50">
        {/* soft blurred copy of the photo as the backdrop, fading into the page */}
        <Image
          src="/images/hero-wide.jpg"
          alt=""
          fill
          sizes="96px"
          className="scale-125 object-cover blur-2xl brightness-[1.04] saturate-110"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-cream-50/25"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 -bottom-0.5 h-[114px] [background:linear-gradient(to_bottom,rgba(251,245,233,0)_0%,rgba(251,245,233,0.03)_14%,rgba(251,245,233,0.1)_28%,rgba(251,245,233,0.24)_44%,rgba(251,245,233,0.46)_60%,rgba(251,245,233,0.72)_78%,rgba(251,245,233,0.92)_92%,#fbf5e9_100%)]"
          aria-hidden="true"
        />
        {/* progressively stronger blur towards the bottom edge */}
        <div
          className="absolute inset-x-0 -bottom-10 h-[152px] backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 -bottom-10 h-24 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent_0%,black_100%)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-[84px] pb-28 sm:px-6 sm:pt-24 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
          {/* gradient frame: champagne gold fading to terracotta */}
          <div className="hero-rise w-full rounded-[1.75rem] bg-gradient-to-br from-gold-300 via-gold-400 to-salamander-400 p-[3px] shadow-[0_6px_18px_rgba(60,40,25,0.14)]">
            <div className="relative aspect-[520/380] overflow-hidden rounded-[calc(1.75rem-3px)]">
              <Image
                src="/images/hero-wide.jpg"
                alt={t("heroPhotoAlt")}
                fill
                priority
                sizes="(min-width: 1024px) 620px, 92vw"
                className="hero-zoom object-cover object-[0%_50%]"
              />
            </div>
          </div>

          <div className="flex flex-col items-center text-center text-taupe-800">
            <h1 className="hero-rise font-display text-xl leading-[1.15] italic sm:text-2xl">
              {t("heroTitle")}
            </h1>
            <span
              className="hero-rise my-5 block h-px w-14 bg-gold-600"
              aria-hidden="true"
            />
            {/* four plain facts, no boxes and no buttons: they only inform */}
            <ul className="w-full max-w-[300px] divide-y divide-gold-600/30">
              {HERO_POINTS.map((point, i) => (
                <li
                  key={point.key}
                  style={{ animationDelay: `${0.45 + i * 0.18}s` }}
                  className="hero-rise flex items-center gap-3 py-3 text-left"
                >
                  <span className="shrink-0 text-gold-600">{point.icon}</span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-sm font-semibold text-taupe-800">
                      {t(`${point.key}Title`)}
                    </span>
                    <span className="block text-xs text-taupe-600">
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
                textured
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
