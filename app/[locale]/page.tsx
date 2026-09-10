import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Home() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-24 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm font-semibold tracking-[0.2em] text-terracotta-600 uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="max-w-2xl font-display text-4xl leading-tight text-brown-800 sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-base text-brown-600">{t("subtitle")}</p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
        <Link
          href="/events"
          className="flex-1 rounded-full bg-terracotta-500 px-8 py-4 text-sm font-semibold text-cream-50 transition-colors hover:bg-terracotta-600"
        >
          {tNav("events")}
        </Link>
        <Link
          href="/stationary"
          className="flex-1 rounded-full border border-brown-500 px-8 py-4 text-sm font-semibold text-brown-700 transition-colors hover:bg-brown-500 hover:text-cream-50"
        >
          {tNav("stationary")}
        </Link>
      </div>

      <p className="text-xs text-brown-400">{t("scrollHint")}</p>
    </div>
  );
}
