import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getVisibleMainCategories } from "@/lib/main-categories";
import { categoryColorClass } from "@/lib/category-colors";
import { getFeaturedProductsByMain, getMainImageUrl } from "@/lib/db/products";
import FeaturedTile from "@/components/landing/FeaturedTile";
import ProductTile from "@/components/product/ProductTile";
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
      <section className="relative -mt-[68px] h-[560px] overflow-hidden sm:h-[640px]">
        <Image
          src="/images/hero-home.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_62%]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/30"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex h-full max-w-6xl items-end px-4 pb-8 sm:px-6 sm:pb-14">
          <div className="max-w-md rounded-3xl border border-white/20 bg-choc/50 p-7 text-cream-50 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-md sm:p-9">
            <h1 className="font-display text-4xl leading-[1.08] italic sm:text-5xl">
              {t("tagline")}
            </h1>
            <a
              href="#categorii"
              className="mt-6 inline-block rounded-full bg-gold-400 px-8 py-3 text-xs font-semibold tracking-[0.14em] text-choc uppercase transition-colors hover:bg-gold-300"
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
          ).map(([title, body]) => (
            <div key={title}>
              <p className="font-display text-lg text-taupe-800">{t(title)}</p>
              <p className="text-xs text-taupe-500">{t(body)}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="categorii"
        className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-16"
      >
        <h2 className="text-center font-display text-4xl text-taupe-800 italic">
          {t("discover")}
        </h2>
        <span
          className="mx-auto mt-3 block h-px w-12 bg-gold-600"
          aria-hidden="true"
        />
        <div className="mt-10 flex flex-wrap justify-center gap-5">
          {sections.map(({ main, imageUrl }) => (
            <div key={main.id} className="w-[calc(50%-10px)] sm:w-56">
              <ProductTile
                href={`/${main.slug}`}
                name={main.name}
                imageUrl={imageUrl}
                placeholderClass={categoryColorClass(main.colorKey)}
              />
            </div>
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
            <h2 className="text-center font-display text-4xl text-taupe-800 italic">
              {main.name}
            </h2>
            <span
              className="mx-auto mt-3 block h-px w-12 bg-gold-600"
              aria-hidden="true"
            />
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
              {products.map((product) => (
                <FeaturedTile
                  key={product.id}
                  product={product}
                  main={main}
                  locale={locale}
                />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href={`/${main.slug}`}
                className="inline-block rounded-full bg-gold-400 px-9 py-3 text-xs font-semibold tracking-[0.14em] text-choc uppercase transition-colors hover:bg-gold-300"
              >
                {t("viewMore")}
              </Link>
            </div>
          </section>
        ))}
    </div>
  );
}
