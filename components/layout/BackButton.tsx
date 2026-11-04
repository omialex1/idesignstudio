"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

// A "Back" button on every page except the homepage. It sits in the empty space
// under the header (every page leaves room there), so no page moves.
// Back goes to the page the person came from inside the site; on a page opened
// directly (a link, a bookmark, a reload) there is nothing to go back to, so it
// goes one level up instead (a product to its subcategory, a subcategory to its
// category, anything else to the homepage).
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

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30">
      <div className="mx-auto w-full max-w-6xl px-6">
        <button
          type="button"
          onClick={goBack}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white/85 px-3.5 py-1.5 text-sm font-medium text-taupe-700 shadow-sm backdrop-blur-sm transition-colors hover:border-salamander-400 hover:text-salamander-600"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ←
          </span>
          {t("back")}
        </button>
      </div>
    </div>
  );
}
