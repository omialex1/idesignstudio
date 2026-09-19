import { getTranslations } from "next-intl/server";

export default async function CompanyInfoBlock() {
  const t = await getTranslations("Legal");

  return (
    <div className="flex flex-col gap-1 text-sm text-brown-600">
      <p className="font-semibold text-brown-800">{t("companyName")}</p>
      <p>{t("companyRegCom")}</p>
      <p>{t("companyCui")}</p>
      <p>{t("companyAddress")}</p>
      <p>{t("companyPhone")}</p>
      <p>
        {t("companyEmailLabel")} {t("companyEmailPlaceholder")}
      </p>
    </div>
  );
}
