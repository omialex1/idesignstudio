import { getTranslations } from "next-intl/server";

export default async function EventsPage() {
  const t = await getTranslations("EventsPage");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-semibold tracking-[0.2em] text-terracotta-600 uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="max-w-2xl font-display text-4xl text-brown-800">
        {t("title")}
      </h1>
      <p className="max-w-lg text-brown-600">{t("subtitle")}</p>
    </div>
  );
}
