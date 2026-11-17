import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SocialIcons from "@/components/layout/SocialIcons";
import { getVisibleMainCategories } from "@/lib/main-categories";
import { FOOTER_COLOR, FOOTER_TEXTURE } from "@/lib/footer-texture";

export default async function Footer() {
  const t = await getTranslations("Footer");
  const tLegal = await getTranslations("Legal");
  const tFav = await getTranslations("Favorites");
  const tCart = await getTranslations("Cart");
  const mainCategories = await getVisibleMainCategories(await getLocale());
  // the phone as digits for the tap-to-call link
  const tel = tLegal("companyPhone").replace(/[^+\d]/g, "");
  const heading =
    "text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase";
  const link = "w-fit text-cream-50 transition-colors hover:text-gold-300";

  return (
    <footer className="relative isolate text-cream-50">
      {/* the background: dark chocolate with a fine stucco texture; the page colour is drawn over its top as a soft wave (with a fine gold line above it), so it melts into the page */}
      <div
        className="absolute inset-0 -z-10 overflow-hidden"
        style={{ backgroundColor: FOOTER_COLOR, backgroundImage: FOOTER_TEXTURE }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-x-0 top-0 hidden h-[220px] bg-[length:100%_100%] bg-no-repeat sm:block"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%201440%20220'%20preserveAspectRatio='none'%3E%3Cdefs%3E%3Cfilter%20id='b'%20filterUnits='userSpaceOnUse'%20x='-400.0'%20y='-600'%20width='2240.0'%20height='1000'%3E%3CfeGaussianBlur%20stdDeviation='15'/%3E%3C/filter%3E%3ClinearGradient%20id='g'%20gradientUnits='userSpaceOnUse'%20x1='72.0'%20x2='1368.0'%20y1='0'%20y2='0'%3E%3Cstop%20offset='0'%20stop-color='%23d2a868'%20stop-opacity='0'/%3E%3Cstop%20offset='0.14'%20stop-color='%23d2a868'%20stop-opacity='0.95'/%3E%3Cstop%20offset='0.86'%20stop-color='%23d2a868'%20stop-opacity='0.95'/%3E%3Cstop%20offset='1'%20stop-color='%23d2a868'%20stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath%20filter='url%28%23b%29'%20fill='%23fbf5e9'%20d='M-300.0%20-500%20L-300.0%20120%20C%200.0%2084,%20480.0%2084,%20720.0%20120%20S%201200.0%20156,%201740.0%20114%20L1740.0%20-500%20Z'/%3E%3Cpath%20fill='none'%20stroke='url%28%23g%29'%20stroke-width='1.4'%20vector-effect='non-scaling-stroke'%20d='M-300.0%2088%20C%200.0%2052,%20480.0%2052,%20720.0%2088%20S%201200.0%20124,%201740.0%2082'/%3E%3C/svg%3E")` }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[190px] bg-[length:100%_100%] bg-no-repeat sm:hidden"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20480%20190'%20preserveAspectRatio='none'%3E%3Cdefs%3E%3Cfilter%20id='b'%20filterUnits='userSpaceOnUse'%20x='-133.3'%20y='-600'%20width='746.7'%20height='1000'%3E%3CfeGaussianBlur%20stdDeviation='10'/%3E%3C/filter%3E%3ClinearGradient%20id='g'%20gradientUnits='userSpaceOnUse'%20x1='48.0'%20x2='432.0'%20y1='0'%20y2='0'%3E%3Cstop%20offset='0'%20stop-color='%23d2a868'%20stop-opacity='0'/%3E%3Cstop%20offset='0.14'%20stop-color='%23d2a868'%20stop-opacity='0.95'/%3E%3Cstop%20offset='0.86'%20stop-color='%23d2a868'%20stop-opacity='0.95'/%3E%3Cstop%20offset='1'%20stop-color='%23d2a868'%20stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath%20filter='url%28%23b%29'%20fill='%23fbf5e9'%20d='M-100.0%20-500%20L-100.0%20104%20C%200.0%2092,%20160.0%2092,%20240.0%20104%20S%20400.0%20116,%20580.0%2098%20L580.0%20-500%20Z'/%3E%3Cpath%20fill='none'%20stroke='url%28%23g%29'%20stroke-width='1.4'%20vector-effect='non-scaling-stroke'%20d='M-100.0%2078%20C%200.0%2066,%20160.0%2066,%20240.0%2078%20S%20400.0%2090,%20580.0%2072'/%3E%3C/svg%3E")` }}
        />
      </div>
      <div className="mx-auto max-w-7xl px-6 pt-32 pb-8 sm:pt-44">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.35fr] lg:gap-12">
          {/* the brand, a line about it and the social media pages */}
          <div className="flex flex-col gap-5">
            <p className="font-display text-3xl text-cream-50">
              iDesignStudio<span className="text-gold-300">.ro</span>
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-cream-100">
              {t("tagline")}
            </p>
            <div className="flex flex-col gap-3">
              <p className={heading}>{t("follow")}</p>
              <SocialIcons label={t("follow")} />
            </div>
          </div>

          {/* where to go in the shop */}
          <nav aria-label={t("shop")} className="flex flex-col gap-3 text-sm">
            <p className={heading}>{t("shop")}</p>
            {mainCategories.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className={link}>
                {c.name}
              </Link>
            ))}
            <Link href="/favorites" className={link}>
              {tFav("label")}
            </Link>
            <Link href="/cart" className={link}>
              {tCart("cartLabel")}
            </Link>
          </nav>

          {/* the legal pages and the consumer protection badge */}
          <nav aria-label={t("info")} className="flex flex-col gap-3 text-sm">
            <p className={heading}>{t("info")}</p>
            <Link href="/terms" className={link}>
              {tLegal("termsLink")}
            </Link>
            <Link href="/privacy" className={link}>
              {tLegal("privacyLink")}
            </Link>
            <Link href="/withdrawal" className={link}>
              {tLegal("withdrawalLink")}
            </Link>
            <a
              href="https://reclamatiisal.anpc.ro/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block w-fit rounded bg-white px-2 py-1"
            >
              <Image
                src="/legal/anpc-sal.png"
                alt={tLegal("anpcSalAlt")}
                width={201}
                height={50}
                unoptimized
              />
            </a>
          </nav>

          {/* how to reach us */}
          <address className="flex flex-col gap-3 text-sm not-italic">
            <p className={heading}>{t("contact")}</p>
            <a href={`tel:${tel}`} className={link}>
              {tLegal("companyPhone").replace(/^[^:]*:\s*/, "")}
            </a>
            <a href={`mailto:${tLegal("companyEmail")}`} className={link}>
              {tLegal("companyEmail")}
            </a>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-cream-200">
                {tLegal("companyOfficeLabel").replace(/:$/, "")}
              </span>
              <a href={`mailto:${tLegal("companyOfficeEmail")}`} className={link}>
                {tLegal("companyOfficeEmail")}
              </a>
            </div>
            <p className="text-cream-100">{tLegal("companyAddress")}</p>
            <p className="text-cream-100">{t("hours")}</p>
          </address>
        </div>

        {/* the company and how to pay, then the rights */}
        <div className="mt-12 flex flex-col gap-5 border-t border-white/15 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1 text-xs text-cream-100">
            <p>
              <span className="font-semibold text-cream-50">
                {tLegal("companyName")}
              </span>
              {" · "}
              {tLegal("companyRegCom")}
              {" · "}
              {tLegal("companyCui")}
            </p>
            <p>
              &copy; {new Date().getFullYear()} iDesignStudio.ro. {t("rights")}
            </p>
          </div>
          <Image
            src="/legal/netopia-visa-mastercard.png"
            alt="NETOPIA Payments, Mastercard, Visa"
            width={1852}
            height={349}
            className="h-8 w-auto self-start rounded bg-white px-2 py-1 lg:self-auto"
          />
        </div>
      </div>
    </footer>
  );
}
