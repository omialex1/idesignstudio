"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export const CART_ADDED_EVENT = "cart:added";

export type CartAddedDetail = {
  name: string;
  variantName: string | null;
  imageUrl: string | null;
};

// Small confirmation card shown after something is added to the cart, with
// the two obvious next steps. Product pages announce an add through the
// "cart:added" window event (see ProductPurchase).
export default function CartToast() {
  const t = useTranslations("Cart");
  const [item, setItem] = useState<CartAddedDetail | null>(null);

  useEffect(() => {
    const onAdded = (e: Event) =>
      setItem((e as CustomEvent<CartAddedDetail>).detail);
    window.addEventListener(CART_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(CART_ADDED_EVENT, onAdded);
  }, []);

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => setItem(null), 9000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [item]);

  if (!item) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-in fixed inset-x-4 bottom-4 z-[60] rounded-2xl border border-cream-200 bg-paper p-4 shadow-[0_18px_50px_rgba(40,25,15,0.28)] sm:inset-x-auto sm:top-[84px] sm:right-6 sm:bottom-auto sm:w-[22rem]"
    >
      <button
        type="button"
        onClick={() => setItem(null)}
        aria-label={t("close")}
        className="absolute top-2 right-3 text-xl leading-none text-taupe-500 hover:text-taupe-800"
      >
        ×
      </button>
      <div className="flex items-center gap-3 pr-5">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-gold-600 ring-offset-2 ring-offset-paper"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-salamander-600 uppercase">
            {t("added")}
          </p>
          <p className="truncate font-display text-lg text-taupe-800">
            {item.name.split(" – ")[0]}
          </p>
          {item.variantName && (
            <p className="truncate text-xs text-taupe-500">
              {item.variantName}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/cart"
          onClick={() => setItem(null)}
          className="flex-1 rounded-full bg-gold-400 px-4 py-2.5 text-center text-xs font-semibold tracking-[0.1em] text-choc uppercase transition-colors hover:bg-gold-300"
        >
          {t("viewCart")}
        </Link>
        <button
          type="button"
          onClick={() => setItem(null)}
          className="flex-1 rounded-full border border-cream-300 px-4 py-2.5 text-center text-xs font-semibold tracking-[0.1em] text-taupe-700 uppercase transition-colors hover:border-gold-600 hover:text-taupe-800"
        >
          {t("continueShopping")}
        </button>
      </div>
    </div>
  );
}
