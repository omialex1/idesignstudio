import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategoriesByLine } from "@/lib/db/categories";
import { interleaveCategories } from "@/lib/merge-categories";
import CategoryFeed from "@/components/landing/CategoryFeed";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");

  const [eventsCategories, stationaryCategories] = await Promise.all([
    getCategoriesByLine("EVENTS", locale),
    getCategoriesByLine("STATIONARY", locale),
  ]);
  const feed = interleaveCategories(eventsCategories, stationaryCategories);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-semibold tracking-[0.2em] text-terracotta-600 uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="max-w-2xl font-display text-4xl leading-tight text-taupe-800 sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-base text-taupe-600">{t("subtitle")}</p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
          <Link
            href="/events"
            className="flex-1 rounded-full bg-terracotta-500 px-8 py-4 text-sm font-semibold text-cream-50 transition-colors hover:bg-blush-400"
          >
            {tNav("events")}
          </Link>
          <Link
            href="/stationary"
            className="flex-1 rounded-full border border-cream-300 bg-cream-200 px-8 py-4 text-sm font-semibold text-taupe-800 transition-colors hover:bg-cream-300"
          >
            {tNav("stationary")}
          </Link>
        </div>

        <p className="text-xs text-taupe-400">{t("scrollHint")}</p>
      </div>

      <CategoryFeed categories={feed} />
    </div>
  );
}
