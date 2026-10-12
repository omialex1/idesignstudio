"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useCartStore } from "@/lib/cart/store";
import { CART_ADDED_EVENT } from "@/components/cart/CartToast";

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

  // On every page except the homepage the bar slides away and comes back when
  // the mouse reaches the top edge. It is shown for a moment after each page
  // load so people can see it exists, and it always stays on touch screens,
  // where there is no mouse to bring it back.
  const [hiddenOn, setHiddenOn] = useState<string | null>(null);
  const visible = hiddenOn !== pathname;
  const bar = useRef<HTMLDivElement>(null);
  const autoHide = pathname !== "/";

  useEffect(() => {
    const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!autoHide || !hasMouse.matches) return;

    let timer: ReturnType<typeof setTimeout>;
    const hideSoon = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => setHiddenOn(pathname), ms);
    };
    const onMove = (e: MouseEvent) => {
      const bottom = bar.current?.getBoundingClientRect().bottom ?? 0;
      if (e.clientY <= Math.max(50, bottom)) {
        clearTimeout(timer);
        setHiddenOn(null);
      } else {
        hideSoon(500);
      }
    };

    // after an add to cart, bring the bar back so the cart badge is seen
    const onAdded = () => {
      setHiddenOn(null);
      hideSoon(6000);
    };

    hideSoon(2200);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener(CART_ADDED_EVENT, onAdded);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener(CART_ADDED_EVENT, onAdded);
    };
  }, [autoHide, pathname]);

  const navLinks = categories.map((c) => ({
    href: `/${c.slug}`,
    label: c.name,
  }));

  return (
    <header
      onFocusCapture={() => setHiddenOn(null)}
      className={`sticky top-0 z-50 transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none ${
        visible ? "" : "pointer-events-none -translate-y-full opacity-0"
      }`}
    >
      <div
        ref={bar}
        className="border-b border-white/15 bg-choc/60 text-cream-100 backdrop-blur-md"
      >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 sm:px-6 sm:py-2.5">
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-cream-100 transition-colors hover:text-gold-400 lg:hidden"
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
            className="font-display text-lg tracking-wide text-cream-50 sm:text-2xl"
          >
            iDesignStudio
            <span className="text-gold-400">.ro</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-cream-100/90 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-gold-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-4">
          <div className="flex items-center gap-1 rounded-full border border-white/20 p-1 text-xs font-semibold text-cream-100/80">
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                className={`rounded-full px-1.5 py-1 transition-colors sm:px-2 ${
                  locale === loc
                    ? "bg-gold-400 text-choc"
                    : "hover:text-gold-400"
                }`}
              >
                {loc.toUpperCase()}
              </Link>
            ))}
          </div>

          <Link
            href="/account"
            aria-label={tAccount("accountLabel")}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/20 text-cream-100 transition-colors hover:text-gold-400"
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
            className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/20 text-cream-100 transition-colors hover:text-gold-400"
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
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-semibold text-choc">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
      </div>

      {menuOpen && (
        <nav className="border-b border-white/15 bg-choc/70 px-6 py-3 text-cream-100 backdrop-blur-md lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2.5 text-sm font-medium text-cream-100 hover:text-gold-400"
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
