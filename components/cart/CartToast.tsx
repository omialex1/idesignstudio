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
// the two obvious next steps. It stays until the visitor closes it (x, Esc or
// "continue shopping"). Product pages announce an add through the
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [item]);

  if (!item) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-in fixed inset-x-4 bottom-4 z-[60] rounded-2xl border border-cream-200 bg-paper p-4 shadow-[0_18px_50px_rgba(40,25,15,0.28)] sm:inset-x-auto sm:top-[72px] sm:right-6 sm:bottom-auto sm:w-[22rem]"
    >
      <button
        type="button"
        onClick={() => setItem(null)}
        aria-label={t("close")}
        className="absolute top-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-transparent text-[2.5rem] leading-none text-taupe-800 transition duration-200 hover:border-red-500 hover:bg-red-500/10 hover:text-red-600 hover:shadow-[0_0_16px_rgba(239,68,68,0.6)] focus-visible:border-red-500 focus-visible:bg-red-500/10 focus-visible:text-red-600 focus-visible:shadow-[0_0_16px_rgba(239,68,68,0.6)] focus-visible:outline-none"
      >
        <span aria-hidden="true" className="-mt-1">
          ×
        </span>
      </button>
      <div className="flex items-center gap-3 pr-11">
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
          className="flex flex-1 items-center justify-center rounded-full bg-gold-400 px-4 py-2.5 text-center text-xs font-semibold tracking-[0.1em] text-choc uppercase transition duration-200 hover:-translate-y-px hover:bg-gold-300 hover:shadow-[0_6px_16px_rgba(184,144,63,0.45)]"
        >
          {t("viewCart")}
        </Link>
        <button
          type="button"
          onClick={() => setItem(null)}
          className="flex flex-1 items-center justify-center rounded-full border border-cream-300 px-4 py-2.5 text-center text-xs font-semibold tracking-[0.1em] text-taupe-700 uppercase transition duration-200 hover:-translate-y-px hover:border-gold-600 hover:bg-gold-400/25 hover:text-choc hover:shadow-[0_6px_16px_rgba(184,144,63,0.35)]"
        >
          {t("continueShopping")}
        </button>
      </div>
    </div>
  );
}
