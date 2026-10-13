import { getTranslations } from "next-intl/server";

export default async function CompanyInfoBlock({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const t = await getTranslations("Legal");

  return (
    <div
      className={`flex flex-col gap-1 text-sm ${dark ? "text-cream-50" : "text-taupe-600"}`}
    >
      <p className={`font-semibold ${dark ? "text-cream-50" : "text-taupe-800"}`}>
        {t("companyName")}
      </p>
      <p>{t("companyRegCom")}</p>
      <p>{t("companyCui")}</p>
      <p>{t("companyAddress")}</p>
      <p>{t("companyPhone")}</p>
      <p>
        {t("companyEmailLabel")}{" "}
        <a
          href={`mailto:${t("companyEmail")}`}
          className={`hover:underline ${dark ? "text-cream-50 underline" : "text-salamander-600"}`}
        >
          {t("companyEmail")}
        </a>
      </p>
    </div>
  );
}
