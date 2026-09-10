"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function Header() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();

  const navLinks = [
    { href: "/events" as const, label: t("events") },
    { href: "/stationary" as const, label: t("stationary") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-cream-200 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-display text-xl tracking-tight text-brown-800"
        >
          iDesignStudio
          <span className="text-terracotta-500">.ro</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-brown-700 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-terracotta-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 rounded-full border border-cream-200 p-1 text-xs font-semibold text-brown-600">
          {routing.locales.map((loc) => (
            <Link
              key={loc}
              href={pathname}
              locale={loc}
              className={`rounded-full px-2 py-1 transition-colors ${
                locale === loc
                  ? "bg-terracotta-50 text-terracotta-600"
                  : "hover:text-terracotta-600"
              }`}
            >
              {loc.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
