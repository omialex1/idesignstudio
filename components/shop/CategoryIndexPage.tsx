import { getTranslations } from "next-intl/server";
import { getCategoriesByLine } from "@/lib/db/categories";
import CategoryFeed from "@/components/landing/CategoryFeed";
import type { ProductLine } from "@/lib/generated/prisma";

const messageKey: Record<ProductLine, "EventsPage" | "StationaryPage"> = {
  EVENTS: "EventsPage",
  STATIONARY: "StationaryPage",
};

export default async function CategoryIndexPage({
  line,
  locale,
}: {
  line: ProductLine;
  locale: string;
}) {
  const t = await getTranslations(messageKey[line]);
  const categories = await getCategoriesByLine(line, locale);

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 py-16 text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-terracotta-600 uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl text-taupe-800">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-taupe-600">
          {t("subtitle")}
        </p>
      </div>
      <CategoryFeed categories={categories} />
    </div>
  );
}
