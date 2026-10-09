"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useCartStore } from "@/lib/cart/store";

export default function Header({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const tCart = useTranslations("Cart");
  const tAccount = useTranslations("Account");
  const locale = useLocale();
  const pathname = usePathname();

  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const items = useCartStore((state) => state.items);
  const itemCount = hasHydrated
    ? items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = categories.map((c) => ({
    href: `/${c.slug}`,
    label: c.name,
  }));

  return (
    <header className="sticky top-0 z-50 border-b border-cream-200 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-taupe-700 transition-colors hover:text-salamander-600 lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-5 w-5"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
          <Link
            href="/"
            className="font-display text-lg tracking-tight text-taupe-800 sm:text-xl"
          >
            iDesignStudio
            <span className="text-salamander-500">.ro</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-taupe-700 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-salamander-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 rounded-full border border-cream-200 p-1 text-xs font-semibold text-taupe-600">
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                className={`rounded-full px-2 py-1 transition-colors ${
                  locale === loc
                    ? "bg-salamander-50 text-salamander-600"
                    : "hover:text-salamander-600"
                }`}
              >
                {loc.toUpperCase()}
              </Link>
            ))}
          </div>

          <Link
            href="/account"
            aria-label={tAccount("accountLabel")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200 text-taupe-700 transition-colors hover:text-salamander-600"
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
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-cream-200 text-taupe-700 transition-colors hover:text-salamander-600"
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
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-salamander-500 px-1 text-[10px] font-semibold text-cream-50">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-cream-200 px-6 py-3 lg:hidden">
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2.5 text-sm font-medium text-taupe-700 hover:text-salamander-600"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
