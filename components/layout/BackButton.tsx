"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

// A "Back" button on every page except the homepage, part of the header bar at every
// width (so it is never over the page's content). It is a solid light button, so it
// stands out from the dark bar; from 640 px up it also says "Back".
// Back goes to the page the person came from inside the site; on a page opened
// directly (a link, a bookmark, a reload) there is nothing to go back to, so it goes
// one level up instead (a product to its subcategory, a subcategory to its category,
// anything else to the homepage).
export default function BackButton() {
  const t = useTranslations("Shop");
  const pathname = usePathname();
  const router = useRouter();

  // how many pages were opened inside the site since this one was first loaded
  const opened = useRef(0);
  const loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    opened.current += 1;
  }, [pathname]);

  if (pathname === "/") return null;

  function goBack() {
    if (opened.current > 0) {
      router.back();
      return;
    }
    const parent = pathname.split("/").filter(Boolean).slice(0, -1).join("/");
    router.push(parent ? `/${parent}` : "/");
  }

  const arrow = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("back")}
      title={t("back")}
      className="flex h-8 w-8 max-[359px]:h-7 max-[359px]:w-7 shrink-0 items-center justify-center gap-1.5 rounded-full bg-cream-50 text-choc shadow-sm transition-colors hover:bg-gold-400 sm:h-9 sm:w-auto sm:px-4 sm:text-sm sm:font-semibold"
    >
      {arrow}
      <span className="hidden sm:inline">{t("back")}</span>
    </button>
  );
}
