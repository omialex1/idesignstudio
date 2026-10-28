"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useCartStore } from "@/lib/cart/store";
import { CART_ADDED_EVENT } from "@/components/cart/CartToast";
import SearchForm from "@/components/layout/SearchForm";

export default function Header({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const tCart = useTranslations("Cart");
  const tAccount = useTranslations("Account");
  const tSearch = useTranslations("Search");
  const locale = useLocale();
  const pathname = usePathname();

  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const items = useCartStore((state) => state.items);
  const itemCount = hasHydrated
    ? items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // On every page except the homepage and the account pages the bar slides away and comes back when
  // the mouse reaches the top edge. It is shown for a moment after each page
  // load so people can see it exists, and it always stays on touch screens,
  // where there is no mouse to bring it back.
  const [hiddenOn, setHiddenOn] = useState<string | null>(null);
  const visible = hiddenOn !== pathname;
  const bar = useRef<HTMLDivElement>(null);
  const headerEl = useRef<HTMLElement>(null);
  // (the account pages keep it visible all the time)
  const autoHide = pathname !== "/" && !pathname.startsWith("/account");

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

  // The open mobile menu closes when the page is scrolled or swiped, when
  // something outside it is tapped, and on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const startY = window.scrollY;
    let touchY: number | null = null;
    const close = () => setMenuOpen(false);
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > 8) close();
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null) return;
      const y = e.touches[0]?.clientY ?? touchY;
      // finger moving down (swipe down) or clearly up: close
      if (Math.abs(y - touchY) > 24) close();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!headerEl.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const navLinks = categories.map((c) => ({
    href: `/${c.slug}`,
    label: c.name,
  }));

  return (
    <header
      ref={headerEl}
      onFocusCapture={() => setHiddenOn(null)}
      className={`sticky top-0 z-50 px-3 pt-3 transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none sm:px-6 ${
        visible ? "" : "pointer-events-none -translate-y-[130%] opacity-0"
      }`}
    >
      <div
        ref={bar}
        className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/15 bg-choc/60 px-2.5 py-2 text-cream-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md sm:px-6 sm:py-2.5"
      >
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setSearchOpen(false);
              setMenuOpen((open) => !open);
            }}
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

          <button
            type="button"
            aria-label={searchOpen ? tSearch("close") : tSearch("open")}
            aria-expanded={searchOpen}
            onClick={() => {
              setMenuOpen(false);
              setSearchOpen((open) => !open);
            }}
            className="hidden h-8 w-8 sm:flex sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/20 text-cream-100 transition-colors hover:text-gold-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-4 w-4"
              aria-hidden="true"
            >
              {searchOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </>
              )}
            </svg>
          </button>

          <Link
            href="/account"
            // not prefetched: while logged out that answer is a redirect to the
            // login page, and the router would reuse it right after logging in
            prefetch={false}
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

      {searchOpen && (
        <div className="mx-auto mt-2 max-w-6xl rounded-3xl border border-white/15 bg-choc/80 px-4 py-3 text-cream-100 backdrop-blur-md sm:px-6">
          <SearchForm
            tone="dark"
            autoFocus
            onSubmitted={() => setSearchOpen(false)}
          />
        </div>
      )}

      {menuOpen && (
        <nav className="mx-auto mt-2 max-w-6xl rounded-3xl border border-white/15 bg-choc/80 px-6 py-3 text-cream-100 backdrop-blur-md lg:hidden">
          {/* on phones the search icon would not fit in the bar, so it lives here */}
          <div className="pb-2 sm:hidden">
            <SearchForm tone="dark" onSubmitted={() => setMenuOpen(false)} />
          </div>
          <ul className="flex flex-col">
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
