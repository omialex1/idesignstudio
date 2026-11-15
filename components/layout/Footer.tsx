import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import CompanyInfoBlock from "@/components/legal/CompanyInfoBlock";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const tLegal = await getTranslations("Legal");

  return (
    <footer className="relative isolate text-cream-50">
      {/* the satin; the page colour is drawn over its top as a soft wave (with a fine gold line above it), so it melts into the page */}
      <div
        className="absolute inset-0 -z-10 overflow-hidden bg-[#784239]"
        aria-hidden="true"
      >
        <Image
          src="/images/footer-satin.jpg"
          alt=""
          fill
          sizes="100vw"
          loading="lazy"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[rgba(60,25,20,0.35)]" />
        <div
          className="absolute inset-x-0 top-0 hidden h-[220px] bg-[length:100%_100%] bg-no-repeat sm:block"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%201440%20220'%20preserveAspectRatio='none'%3E%3Cdefs%3E%3Cfilter%20id='b'%20filterUnits='userSpaceOnUse'%20x='-400.0'%20y='-600'%20width='2240.0'%20height='1000'%3E%3CfeGaussianBlur%20stdDeviation='15'/%3E%3C/filter%3E%3ClinearGradient%20id='g'%20gradientUnits='userSpaceOnUse'%20x1='72.0'%20x2='1368.0'%20y1='0'%20y2='0'%3E%3Cstop%20offset='0'%20stop-color='%23d2a868'%20stop-opacity='0'/%3E%3Cstop%20offset='0.14'%20stop-color='%23d2a868'%20stop-opacity='0.95'/%3E%3Cstop%20offset='0.86'%20stop-color='%23d2a868'%20stop-opacity='0.95'/%3E%3Cstop%20offset='1'%20stop-color='%23d2a868'%20stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath%20filter='url%28%23b%29'%20fill='%23fbf5e9'%20d='M-300.0%20-500%20L-300.0%20120%20C%200.0%2084,%20480.0%2084,%20720.0%20120%20S%201200.0%20156,%201740.0%20114%20L1740.0%20-500%20Z'/%3E%3Cpath%20fill='none'%20stroke='url%28%23g%29'%20stroke-width='1.4'%20vector-effect='non-scaling-stroke'%20d='M-300.0%2088%20C%200.0%2052,%20480.0%2052,%20720.0%2088%20S%201200.0%20124,%201740.0%2082'/%3E%3C/svg%3E")` }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[190px] bg-[length:100%_100%] bg-no-repeat sm:hidden"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20480%20190'%20preserveAspectRatio='none'%3E%3Cdefs%3E%3Cfilter%20id='b'%20filterUnits='userSpaceOnUse'%20x='-133.3'%20y='-600'%20width='746.7'%20height='1000'%3E%3CfeGaussianBlur%20stdDeviation='10'/%3E%3C/filter%3E%3ClinearGradient%20id='g'%20gradientUnits='userSpaceOnUse'%20x1='48.0'%20x2='432.0'%20y1='0'%20y2='0'%3E%3Cstop%20offset='0'%20stop-color='%23d2a868'%20stop-opacity='0'/%3E%3Cstop%20offset='0.14'%20stop-color='%23d2a868'%20stop-opacity='0.95'/%3E%3Cstop%20offset='0.86'%20stop-color='%23d2a868'%20stop-opacity='0.95'/%3E%3Cstop%20offset='1'%20stop-color='%23d2a868'%20stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath%20filter='url%28%23b%29'%20fill='%23fbf5e9'%20d='M-100.0%20-500%20L-100.0%20104%20C%200.0%2092,%20160.0%2092,%20240.0%20104%20S%20400.0%20116,%20580.0%2098%20L580.0%20-500%20Z'/%3E%3Cpath%20fill='none'%20stroke='url%28%23g%29'%20stroke-width='1.4'%20vector-effect='non-scaling-stroke'%20d='M-100.0%2078%20C%200.0%2066,%20160.0%2066,%20240.0%2078%20S%20400.0%2090,%20580.0%2072'/%3E%3C/svg%3E")` }}
        />
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 pt-32 pb-10 sm:pt-44">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-display text-2xl text-cream-50">
              iDesignStudio<span className="text-gold-300">.ro</span>
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
            <Link href="/terms" className="text-cream-50 hover:underline">
              {tLegal("termsLink")}
            </Link>
            <Link href="/privacy" className="text-cream-50 hover:underline">
              {tLegal("privacyLink")}
            </Link>
            <Link href="/withdrawal" className="text-cream-50 hover:underline">
              {tLegal("withdrawalLink")}
            </Link>
          </div>
        </div>

        <p className="border-t border-white/20 pt-6 text-sm text-cream-100">
          &copy; {new Date().getFullYear()} iDesignStudio.ro. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
