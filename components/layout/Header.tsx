"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useCartStore } from "@/lib/cart/store";

export default function Header() {
  const t = useTranslations("Nav");
  const tCart = useTranslations("Cart");
  const tAccount = useTranslations("Account");
  const locale = useLocale();
  const pathname = usePathname();

  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const items = useCartStore((state) => state.items);
  const itemCount = hasHydrated
    ? items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

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

        <div className="flex items-center gap-4">
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

          <Link
            href="/account"
            aria-label={tAccount("accountLabel")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200 text-brown-700 transition-colors hover:text-terracotta-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
          </Link>

          <Link
            href="/cart"
            aria-label={tCart("cartLabel")}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-cream-200 text-brown-700 transition-colors hover:text-terracotta-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-semibold text-cream-50">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
