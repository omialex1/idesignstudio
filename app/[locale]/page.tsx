import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getVisibleMainCategories } from "@/lib/main-categories";
import { categoryColorClass } from "@/lib/category-colors";
import { getFeaturedProductsByMain, getMainImageUrl } from "@/lib/db/products";
import FeaturedTile from "@/components/landing/FeaturedTile";
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
      <section className="flex flex-col items-center gap-3 bg-cream-100 px-6 py-16 text-center sm:py-24">
        <p className="font-display text-3xl tracking-[0.15em] text-taupe-800 uppercase sm:text-5xl">
          I Design
          <br />
          Studio
        </p>
        <p className="max-w-md text-sm text-taupe-600 italic sm:text-base">
          {t("tagline")}
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-12">
        <h2 className="text-center font-display text-2xl text-taupe-800 italic">
          {t("discover")}
        </h2>
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible">
          {sections.map(({ main, imageUrl }) => (
            <Link
              key={main.id}
              href={`/${main.slug}`}
              className="group flex w-44 shrink-0 snap-start flex-col gap-2 sm:w-auto"
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={main.name}
                  className="aspect-[3/4] w-full rounded-xl border border-salamander-200 object-cover"
                />
              ) : (
                <div
                  className={`flex aspect-[3/4] w-full items-center justify-center rounded-xl font-display text-4xl ${categoryColorClass(main.colorKey)}`}
                >
                  {main.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-center text-sm font-medium text-taupe-800 group-hover:text-salamander-600">
                {main.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {sections
        .filter(({ products }) => products.length > 0)
        .map(({ main, products }) => (
          <section
            key={main.id}
            className="mx-auto w-full max-w-5xl px-6 py-10"
          >
            <h2 className="text-center font-display text-3xl text-taupe-800 italic">
              {main.name}
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
              {products.map((product) => (
                <FeaturedTile
                  key={product.id}
                  product={product}
                  main={main}
                  locale={locale}
                />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href={`/${main.slug}`}
                className="inline-block rounded-full bg-salamander-500 px-8 py-2.5 text-xs font-semibold tracking-wider text-cream-50 uppercase transition-colors hover:bg-tangerine-400"
              >
                {t("viewMore")}
              </Link>
            </div>
          </section>
        ))}
    </div>
  );
}
