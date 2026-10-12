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
      <section className="relative -mt-[53px] sm:-mt-[58px] overflow-hidden bg-choc">
        {/* soft blurred copy of the photo as the backdrop, fading into the page */}
        <Image
          src="/images/hero-home.jpg"
          alt=""
          fill
          sizes="96px"
          className="scale-125 object-cover blur-2xl brightness-[0.7] saturate-125"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-cream-50"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pt-28 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:pt-32 lg:pb-24">
          <div className="hero-rise justify-self-center lg:order-2 lg:justify-self-end">
            {/* gradient frame: champagne gold fading to terracotta */}
            <div className="rounded-[2rem] bg-gradient-to-br from-gold-300 via-gold-400 to-salamander-400 p-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="relative aspect-[4/5] w-[min(74vw,360px)] overflow-hidden rounded-[calc(2rem-3px)] lg:w-[400px]">
                <Image
                  src="/images/hero-home.jpg"
                  alt=""
                  fill
                  priority
                  sizes="400px"
                  className="hero-zoom object-cover"
                />
              </div>
            </div>
          </div>
          <div className="hero-rise max-w-md rounded-3xl border border-white/20 bg-choc/50 p-7 text-cream-50 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-md sm:p-9 lg:order-1">
            <h1 className="font-display text-4xl leading-[1.08] italic sm:text-5xl">
              {t("tagline")}
            </h1>
            <a
              href="#categorii"
              className="hero-rise-late mt-6 inline-block rounded-full bg-gold-400 px-8 py-3 text-xs font-semibold tracking-[0.14em] text-choc uppercase transition-colors hover:bg-gold-300"
            >
              {t("heroCta")}
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-cream-200">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-6 py-6 text-center sm:grid-cols-4">
          {(
            [
              ["trustMadeTitle", "trustMadeBody"],
              ["trustColorsTitle", "trustColorsBody"],
              ["trustShipTitle", "trustShipBody"],
              ["trustPayTitle", "trustPayBody"],
            ] as const
          ).map(([title, body], i) => (
            <Reveal key={title} index={i}>
              <p className="font-display text-lg text-taupe-800">{t(title)}</p>
              <p className="text-xs text-taupe-500">{t(body)}</p>
            </Reveal>
          ))}
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
