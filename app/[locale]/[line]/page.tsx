import { notFound } from "next/navigation";
import CategoryIndexPage from "@/components/shop/CategoryIndexPage";
import { lineFromSlug } from "@/lib/lines";

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
