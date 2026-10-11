import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import CompanyInfoBlock from "@/components/legal/CompanyInfoBlock";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const tLegal = await getTranslations("Legal");

  return (
    <footer className="bg-choc text-cream-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-display text-2xl text-cream-50">
              iDesignStudio<span className="text-gold-400">.ro</span>
            </p>
            <Image
              src="/legal/netopia-visa-mastercard.png"
              alt="NETOPIA Payments, Mastercard, Visa"
              width={1852}
              height={349}
              className="mt-4 h-8 w-auto rounded bg-white px-2 py-1"
            />
            <a
              href="https://reclamatiisal.anpc.ro/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-fit rounded bg-white px-2 py-1"
            >
              <Image
                src="/legal/anpc-sal.png"
                alt={tLegal("anpcSalAlt")}
                width={201}
                height={50}
                unoptimized
              />
            </a>
          </div>

          <CompanyInfoBlock tone="dark" />

          <div className="flex flex-col gap-2 text-sm">
            <Link
              href="/terms"
              className="text-cream-200 hover:text-gold-400 hover:underline"
            >
              {tLegal("termsLink")}
            </Link>
            <Link
              href="/privacy"
              className="text-cream-200 hover:text-gold-400 hover:underline"
            >
              {tLegal("privacyLink")}
            </Link>
            <Link
              href="/withdrawal"
              className="text-cream-200 hover:text-gold-400 hover:underline"
            >
              {tLegal("withdrawalLink")}
            </Link>
          </div>
        </div>

        <p className="border-t border-white/10 pt-6 text-sm text-cream-300/80">
          &copy; {new Date().getFullYear()} iDesignStudio.ro. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
