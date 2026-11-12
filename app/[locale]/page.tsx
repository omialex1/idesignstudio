import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getVisibleMainCategories } from "@/lib/main-categories";
import { categoryColorClass } from "@/lib/category-colors";
import {
  getMainImageUrl,
  getMainProductCount,
  getNewestProducts,
  getSubcategoryShowcase,
} from "@/lib/db/products";
import SubcategoryCard from "@/components/landing/SubcategoryCard";
import HeroSlideshow from "@/components/landing/HeroSlideshow";
import { HERO_SLIDES } from "@/lib/hero-slides";
import StripCard from "@/components/product/StripCard";
import { shortName } from "@/components/product/ProductTile";
import { formatPrice } from "@/lib/format";
import EndlessRow from "@/components/layout/EndlessRow";
import CategoryFeatureCard from "@/components/landing/CategoryFeatureCard";
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


export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const tShop = await getTranslations("Shop");
  const mainCategories = await getVisibleMainCategories(locale);

  const newest = await getNewestProducts(locale, 5);

  const sections = await Promise.all(
    mainCategories.map(async (main) => ({
      main,
      imageUrl: await getMainImageUrl(main.id),
      count: await getMainProductCount(main.id),
      subcategories: await getSubcategoryShowcase(main.id, locale),
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
      {/* the slideshow: the title of the page stays for screen readers and Google */}
      <section className="relative -mt-[68px] px-4 pt-[84px] pb-4 sm:px-6 sm:pt-24 sm:pb-6">
        <h1 className="sr-only">{t("heroTitle")}</h1>
        <div className="mx-auto max-w-5xl">
          <HeroSlideshow
            label={t("heroLabel")}
            cta={t("viewCollection")}
            prevLabel={t("heroPrev")}
            nextLabel={t("heroNext")}
            dotLabels={HERO_SLIDES.map((_, i) =>
              t("heroSlide", { n: i + 1, total: HERO_SLIDES.length }),
            )}
            slides={HERO_SLIDES.map((slide) => ({
              src: slide.image,
              title: locale === "en" ? slide.title.en : slide.title.ro,
              href: slide.href,
              focus: slide.focus,
            }))}
          />
        </div>
      </section>

      <section
        id="categorii"
        className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 pt-6 pb-16"
      >
        <Reveal>
          <h2 className="text-center font-display text-3xl text-taupe-800 italic sm:text-4xl">
            {t("discover")}
          </h2>
          <span
            className="mx-auto mt-3 block h-px w-12 bg-gold-600"
            aria-hidden="true"
          />
        </Reveal>
        {/* the first category (the one with most products) is a little bigger than the
            others. With three, it takes the whole left column and the other two sit one
            above the other on the right, in cells of the same grid, so the edges line up. */}
        <div
          className={`mt-10 grid gap-4 sm:gap-5 ${
            sections.length >= 3
              ? "grid-cols-2 sm:grid-cols-[1fr_1.1fr] sm:grid-rows-2"
              : sections.length === 2
                ? "grid-cols-2"
                : ""
          }`}
        >
          {sections.map(({ main, imageUrl, count }, i) => (
            <Reveal
              key={main.id}
              index={i}
              className={`h-full ${
                i === 0 && sections.length >= 3
                  ? "col-span-2 sm:col-span-1 sm:row-span-2"
                  : ""
              }`}
            >
              <CategoryFeatureCard
                large={i === 0}
                href={`/${main.slug}`}
                name={main.name}
                imageUrl={imageUrl}
                placeholderClass={categoryColorClass(main.colorKey)}
                countLabel={t("productCount", { count })}
                cta={t("viewCollection")}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* the five newest products, shown like "Merge bine cu" */}
      {newest.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-6 py-12">
          <Reveal>
            <h2 className="text-center font-display text-3xl text-taupe-800 italic sm:text-4xl">
              {t("newTitle")}
            </h2>
            <span
              className="mx-auto mt-3 block h-px w-12 bg-gold-600"
              aria-hidden="true"
            />
          </Reveal>
          <div className="mt-8">
            <EndlessRow
              centered
              resetKey={newest.map((p) => p.id).join(",")}
              prevLabel={tShop("previous")}
              nextLabel={tShop("next")}
              itemClassName="w-[125px] shrink-0 sm:w-[141px]"
              items={newest.map((p) => {
                const price = formatPrice(p.priceCents, p.currency, locale);
                return {
                  key: p.id,
                  node: (
                    <StripCard
                      cornerClass="rounded-2xl"
                      item={{
                        id: p.id,
                        href: p.href,
                        name: shortName(p.name),
                        imageUrl: p.imageUrl,
                        placeholderClass: categoryColorClass(p.colorKey),
                        note: p.inStock ? undefined : tShop("outOfStock"),
                        price: p.hasVariants
                          ? tShop("fromPrice", { price })
                          : price,
                        oldPrice: p.oldPriceCents
                          ? formatPrice(p.oldPriceCents, p.currency, locale)
                          : undefined,
                        badge:
                          p.oldPriceCents && p.percentOff
                            ? `−${p.percentOff}%${p.promoLabel ? ` · ${p.promoLabel}` : ""}`
                            : (p.promoLabel ?? undefined),
                        card: p,
                      }}
                    />
                  ),
                };
              })}
            />
          </div>
        </section>
      )}

      {sections
        .filter(({ subcategories }) => subcategories.length > 0)
        .map(({ main, subcategories }) => (
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
            {/* one card per subcategory (a new one shows up by itself), endlessly to the
                right; the photo is only an example product of that subcategory */}
            <div className="mt-10">
              <EndlessRow
                centered
                resetKey={subcategories.map((c) => c.id).join(",")}
                prevLabel={tShop("previous")}
                nextLabel={tShop("next")}
                itemClassName="w-[176px] shrink-0 sm:w-[200px]"
                trackClassName="pt-4 pb-9 -mt-2 -mb-5"
                arrowClassName="top-[45%]"
                items={subcategories.map((sub) => ({
                  key: sub.id,
                  node: (
                    <SubcategoryCard
                      href={`/${main.slug}/${sub.slug}`}
                      name={sub.name}
                      countLabel={t("productCount", { count: sub.count })}
                      cta={t("viewCollection")}
                      images={sub.images}
                      placeholderClass={categoryColorClass(main.colorKey)}
                    />
                  ),
                }))}
              />
            </div>
            {/* with a single subcategory its card already leads to everything */}
            {subcategories.length > 1 && (
              <Reveal className="mt-10 text-center">
                <Link
                  href={`/${main.slug}`}
                  className="inline-block rounded-full bg-gold-400 px-9 py-3 text-xs font-semibold tracking-[0.14em] text-choc uppercase transition-colors hover:bg-gold-300"
                >
                  {t("viewMore")}
                </Link>
              </Reveal>
            )}
          </section>
        ))}

      <section className="mx-auto w-full max-w-5xl px-6 pt-8 pb-16">
        <Reveal>
          <h2 className="text-center font-display text-4xl text-taupe-800 italic">
            {t("howTitle")}
          </h2>
          <span
            className="mx-auto mt-3 block h-px w-12 bg-gold-600"
            aria-hidden="true"
          />
        </Reveal>
        {/* numbered, with fine lines and no icons: plainly information, not buttons */}
        <ol className="mt-10 grid grid-cols-2 border-y border-gold-600/40 lg:grid-cols-4">
          {(["step1", "step2", "step3", "step4"] as const).map((key, i) => (
            <li
              key={key}
              className={`px-4 py-6 text-center ${
                i % 2 === 1 ? "border-l border-gold-600/30" : ""
              } ${i >= 2 ? "border-t border-gold-600/30 lg:border-t-0" : ""} ${
                i > 0 ? "lg:border-l lg:border-gold-600/30" : ""
              }`}
            >
              <span
                className="block font-display text-4xl leading-none text-gold-600"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="mt-3 block text-sm font-semibold text-taupe-800">
                {t(`${key}Title`)}
              </span>
              <span className="mt-0.5 block text-xs text-taupe-600">
                {t(`${key}Body`)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
