import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Fraunces, Manrope } from "next/font/google";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import { getMainCategories } from "@/lib/main-categories";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PendingOrderWatcher from "@/components/checkout/PendingOrderWatcher";
import "../globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: "%s | iDesignStudio.ro" },
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: "iDesignStudio.ro",
      locale: locale === "en" ? "en_GB" : "ro_RO",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const mainCategories = await getMainCategories(locale);

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider>
          <PendingOrderWatcher />
          <Header
            categories={mainCategories.map((c) => ({ slug: c.slug, name: c.name }))}
          />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
