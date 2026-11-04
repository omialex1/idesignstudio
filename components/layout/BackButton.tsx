"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

// A "Back" button on every page except the homepage, always in view and never over
// the page's content:
// - below 1280 px wide it is a round arrow inside the header bar (the bar stays in
//   view at those widths);
// - from 1280 px up it floats in the empty margin to the left of the content
//   (there is always room there: the content is at most 72rem wide).
// Back goes to the page the person came from inside the site; on a page opened
// directly (a link, a bookmark, a reload) there is nothing to go back to, so it goes
// one level up instead (a product to its subcategory, a subcategory to its category,
// anything else to the homepage).
export default function BackButton({
  variant,
}: {
  variant: "header" | "floating";
}) {
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

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={t("back")}
        title={t("back")}
        className="flex h-8 w-8 max-[359px]:h-7 max-[359px]:w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-cream-100 transition-colors hover:text-gold-400 sm:h-9 sm:w-9 xl:hidden"
      >
        {arrow}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("back")}
      title={t("back")}
      // in the margin left of the 72rem content column (at least 12 px from the edge)
      className="fixed top-28 left-[max(12px,calc((100vw-72rem)/2-60px))] z-40 hidden h-11 w-11 items-center justify-center rounded-full border border-cream-300 bg-white/90 text-taupe-700 shadow-md backdrop-blur-sm transition-colors hover:border-salamander-400 hover:text-salamander-600 xl:flex"
    >
      {arrow}
    </button>
  );
}
