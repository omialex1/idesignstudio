import { notFound } from "next/navigation";
import CategoryIndexPage from "@/components/shop/CategoryIndexPage";
import { lineFromSlug } from "@/lib/lines";
import { getTranslations } from "next-intl/server";
import { pageAlternates } from "@/lib/seo";
import type { Metadata } from "next";

const pageNamespace = {
  EVENTS: "EventsPage",
  HANDMADE: "HandmadePage",
  STATIONARY: "StationaryPage",
  HOME_LIFESTYLE: "HomeLifestylePage",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; line: string }>;
}): Promise<Metadata> {
  const { locale, line } = await params;
  const config = lineFromSlug(line);
  if (!config) return {};
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const t = await getTranslations({ locale, namespace: pageNamespace[config.line] });
  return {
    title: tNav(config.navKey),
    description: t("subtitle"),
    alternates: pageAlternates(locale, `/${config.slug}`),
  };
}

export default async function LinePage({
  params,
}: {
  params: Promise<{ locale: string; line: string }>;
}) {
  const { locale, line } = await params;
  const config = lineFromSlug(line);
  if (!config) notFound();
  return <CategoryIndexPage line={config.line} locale={locale} />;
}
