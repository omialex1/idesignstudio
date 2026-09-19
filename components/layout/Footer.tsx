import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import CompanyInfoBlock from "@/components/legal/CompanyInfoBlock";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const tLegal = await getTranslations("Legal");

  return (
    <footer className="border-t border-cream-200 bg-cream-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-display text-taupe-800">
              iDesignStudio<span className="text-terracotta-500">.ro</span>
            </p>
            <p className="mt-3 text-xs text-taupe-500">
              Visa &middot; Mastercard &middot; NETOPIA Payments
            </p>
          </div>

          <CompanyInfoBlock />

          <div className="flex flex-col gap-2 text-sm">
            <Link
              href="/terms"
              className="text-taupe-600 hover:text-terracotta-600 hover:underline"
            >
              {tLegal("termsLink")}
            </Link>
            <Link
              href="/privacy"
              className="text-taupe-600 hover:text-terracotta-600 hover:underline"
            >
              {tLegal("privacyLink")}
            </Link>
          </div>
        </div>

        <p className="text-sm text-taupe-500">
          &copy; {new Date().getFullYear()} iDesignStudio.ro. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
