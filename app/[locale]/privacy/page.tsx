import { getTranslations } from "next-intl/server";
import CompanyInfoBlock from "@/components/legal/CompanyInfoBlock";

export default async function PrivacyPage() {
  const t = await getTranslations("Legal");

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="font-display text-3xl text-brown-800">
            {t("privacyTitle")}
          </h1>
          <p className="mt-3 text-brown-600">{t("privacyIntro")}</p>
        </div>

        <Section heading={t("privacyControllerHeading")}>
          <p className="mb-3 text-brown-600">{t("privacyControllerBody")}</p>
          <CompanyInfoBlock />
        </Section>

        <Section
          heading={t("privacyDataHeading")}
          body={t("privacyDataBody")}
        />
        <Section heading={t("privacyUseHeading")} body={t("privacyUseBody")} />
        <Section
          heading={t("privacyRightsHeading")}
          body={t("privacyRightsBody")}
        />

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
      <h2 className="font-display text-xl text-brown-800">{heading}</h2>
      <div className="mt-2">
        {body && <p className="text-brown-600">{body}</p>}
        {children}
      </div>
    </section>
  );
}
