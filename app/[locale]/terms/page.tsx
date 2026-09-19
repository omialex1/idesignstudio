import { getTranslations } from "next-intl/server";
import CompanyInfoBlock from "@/components/legal/CompanyInfoBlock";

export default async function TermsPage() {
  const t = await getTranslations("Legal");

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="font-display text-3xl text-taupe-800">
            {t("termsTitle")}
          </h1>
          <p className="mt-3 text-taupe-600">{t("termsIntro")}</p>
        </div>

        <Section heading={t("termsCompanyHeading")}>
          <p className="mb-3 text-taupe-600">{t("termsCompanyBody")}</p>
          <CompanyInfoBlock />
        </Section>

        <Section heading={t("termsRoleHeading")} body={t("termsRoleBody")} />
        <Section
          heading={t("termsProductsHeading")}
          body={t("termsProductsBody")}
        />
        <Section
          heading={t("termsPaymentHeading")}
          body={t("termsPaymentBody")}
        />
        <Section
          heading={t("termsDeliveryHeading")}
          body={t("termsDeliveryBody")}
        />
        <Section
          heading={t("termsReturnsHeading")}
          body={t("termsReturnsBody")}
        />
        <Section
          heading={t("termsWithdrawalHeading")}
          body={t("termsWithdrawalBody")}
        />

        <Section heading={t("termsDisputesHeading")}>
          <p className="text-taupe-600">
            {t("termsDisputesBody")}{" "}
            <a
              href="https://anpc.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta-600 hover:underline"
            >
              anpc.ro
            </a>
            .
          </p>
          <p className="mt-2 text-taupe-600">
            {t("termsDisputesBodyContinued")}{" "}
            <a
              href="https://consumer-redress.ec.europa.eu/dispute-resolution-bodies"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta-600 hover:underline"
            >
              consumer-redress.ec.europa.eu
            </a>
            .
          </p>
        </Section>

        <Section heading={t("termsContactHeading")}>
          <CompanyInfoBlock />
        </Section>
      </div>
    </div>
  );
}

function Section({
  heading,
  body,
  children,
}: {
  heading: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl text-taupe-800">{heading}</h2>
      <div className="mt-2">
        {body && <p className="text-taupe-600">{body}</p>}
        {children}
      </div>
    </section>
  );
}
