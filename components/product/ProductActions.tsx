"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useFavoritesStore } from "@/lib/favorites/store";
import { CART_ADDED_EVENT, type CartAddedDetail } from "@/components/cart/CartToast";
import type { CardProduct } from "@/lib/product-card";

const base =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors sm:h-10 sm:w-10";

function Icon({
  children,
  filled = false,
}: {
  children: React.ReactNode;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[19px] w-[19px] sm:h-5 sm:w-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// The two round buttons of a product card, next to the price: the heart (favorites,
// kept in the browser) and the cart. The cart adds the product at once when there is
// nothing to choose; otherwise it opens the product page.
export default function ProductActions({ product }: { product: CardProduct }) {
  const t = useTranslations("Shop");
  const tCart = useTranslations("Cart");
  const addItem = useCartStore((s) => s.addItem);
  const hydrated = useFavoritesStore((s) => s.hasHydrated);
  const isFavorite = useFavoritesStore((s) => s.ids.includes(product.id));
  const toggle = useFavoritesStore((s) => s.toggle);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const favorite = hydrated && isFavorite;

  function add() {
    addItem({
      productId: product.id,
      variantId: null,
      variantName: null,
      colorChoices: [],
      colorNote: null,
      slug: product.slug,
      categorySlug: product.categorySlug,
      mainSlug: product.mainSlug,
      colorKey: product.colorKey,
      nameSnapshot: product.name,
      priceCents: product.priceCents,
      fullPriceCents: product.oldPriceCents ?? null,
      discountPercent: product.oldPriceCents ? (product.percentOff ?? null) : null,
      discountLabel: product.promoLabel ?? null,
      currency: product.currency,
      imageUrl: product.imageUrl,
    });
    window.dispatchEvent(
      new CustomEvent<CartAddedDetail>(CART_ADDED_EVENT, {
        detail: {
          name: product.name,
          variantName: null,
          imageUrl: product.imageUrl,
        },
      }),
    );
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 1500);
  }

  const heartLabel = favorite ? t("removeFromFavorites") : t("addToFavorites");

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={favorite}
        aria-label={heartLabel}
        title={heartLabel}
        onClick={() => toggle(product.id)}
        className={`${base} ${
          favorite
            ? "bg-salamander-500 text-cream-50 hover:bg-salamander-600"
            : "bg-cream-100 text-choc hover:bg-cream-200"
        }`}
      >
        <Icon filled={favorite}>
          <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
        </Icon>
      </button>

      {product.quickAdd ? (
        <button
          type="button"
          aria-label={justAdded ? tCart("added") : tCart("addToCart")}
          title={tCart("addToCart")}
          onClick={add}
          className={`${base} bg-choc text-cream-50 hover:bg-gold-400 hover:text-choc`}
        >
          <Icon>
            {justAdded ? (
              <path d="M5 12l5 5l10 -10" />
            ) : (
              <>
                <path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                <path d="M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                <path d="M17 17h-11v-14h-2" />
                <path d="M6 5l6.005 .429m7.138 6.573l-.143 .998h-13" />
                <path d="M15 6h6m-3 -3v6" />
              </>
            )}
          </Icon>
        </button>
      ) : (
        <Link
          href={product.href}
          aria-label={t("chooseOptions")}
          title={t("chooseOptions")}
          className={`${base} bg-choc text-cream-50 hover:bg-gold-400 hover:text-choc`}
        >
          <Icon>
            <path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M17 17h-11v-14h-2" />
            <path d="M6 5l6.005 .429m7.138 6.573l-.143 .998h-13" />
            <path d="M15 6h6m-3 -3v6" />
          </Icon>
        </Link>
      )}
    </span>
  );
}
