import { getTranslations } from "next-intl/server";
import CompanyInfoBlock from "@/components/legal/CompanyInfoBlock";

export default async function PrivacyPage() {
  const t = await getTranslations("Legal");

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="font-display text-3xl text-taupe-800">
            {t("privacyTitle")}
          </h1>
          <p className="mt-3 text-taupe-600">{t("privacyIntro")}</p>
        </div>

        <Section heading={t("privacyControllerHeading")}>
          <p className="mb-3 text-taupe-600">{t("privacyControllerBody")}</p>
          <CompanyInfoBlock />
        </Section>

        <Section
          heading={t("privacyDataHeading")}
          body={t("privacyDataBody")}
        />
        <Section
          heading={t("privacyLegalHeading")}
          body={t("privacyLegalBody")}
        />
        <Section heading={t("privacyUseHeading")} body={t("privacyUseBody")} />
        <Section
          heading={t("privacyRecipientsHeading")}
          body={t("privacyRecipientsBody")}
        />
        <Section
          heading={t("privacyRetentionHeading")}
          body={t("privacyRetentionBody")}
        />
        <Section heading={t("privacyCookiesHeading")}>
          <p className="text-taupe-600">{t("privacyCookiesIntro")}</p>
          <ul className="mt-2 list-disc pl-5 text-taupe-600">
            <li>{t("privacyCookiesItem1")}</li>
            <li>{t("privacyCookiesItem2")}</li>
            <li>{t("privacyCookiesItem3")}</li>
          </ul>
          <p className="mt-2 text-taupe-600">{t("privacyCookiesOutro")}</p>
        </Section>
        <Section
          heading={t("privacyRightsHeading")}
          body={t("privacyRightsBody")}
        >
          <p className="mt-2 text-taupe-600">
            {t("privacyRightsComplaint")}{" "}
            <a
              href="https://www.dataprotection.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-salamander-600 hover:underline"
            >
              www.dataprotection.ro
            </a>
            .
          </p>
        </Section>

        <Section heading={t("privacyContactHeading")}>
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
