"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart/store";
import { useFavoritesStore } from "@/lib/favorites/store";
import {
  CART_ADDED_EVENT,
  type CartAddedDetail,
} from "@/components/cart/CartToast";
import type { CardProduct } from "@/lib/product-card";

const HEART_PATH =
  "M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572";

const roundBase =
  "flex shrink-0 items-center justify-center rounded-full transition-colors";
const sizeMd = "h-9 w-9 sm:h-10 sm:w-10";
const sizeSm = "h-7 w-7 sm:h-8 sm:w-8";

// The heart on the product page: a pill with the words, next to "Add to cart".
export function FavoriteButton({ productId }: { productId: string }) {
  const t = useTranslations("Shop");
  const hydrated = useFavoritesStore((s) => s.hasHydrated);
  const isFavorite = useFavoritesStore((s) => s.ids.includes(productId));
  const toggle = useFavoritesStore((s) => s.toggle);
  const favorite = hydrated && isFavorite;
  return (
    <button
      type="button"
      aria-pressed={favorite}
      title={favorite ? t("removeFromFavorites") : t("addToFavorites")}
      onClick={() => toggle(productId)}
      className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
        favorite
          ? "bg-salamander-500 text-cream-50 hover:bg-salamander-600"
          : "bg-cream-100 text-taupe-800 hover:bg-cream-200"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={favorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d={HEART_PATH} />
      </svg>
      {favorite ? t("inFavorites") : t("addToFavorites")}
    </button>
  );
}

function Icon({
  children,
  filled = false,
  small = false,
}: {
  children: React.ReactNode;
  filled?: boolean;
  small?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        small
          ? "h-4 w-4 sm:h-[17px] sm:w-[17px]"
          : "h-[19px] w-[19px] sm:h-5 sm:w-5"
      }
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// The two round buttons of a product card, next to the price: the heart (favorites,
// kept in the browser) and the cart. The cart adds the product at once when there is
// nothing to choose; otherwise it opens the product page.
export default function ProductActions({
  product,
  compact = false,
}: {
  product: CardProduct;
  // smaller buttons, for the narrow cards of "Merge bine cu"
  compact?: boolean;
}) {
  const base = `${roundBase} ${compact ? sizeSm : sizeMd}`;
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
      discountPercent: product.oldPriceCents
        ? (product.percentOff ?? null)
        : null,
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
        <Icon filled={favorite} small={compact}>
          <path d={HEART_PATH} />
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
          <Icon small={compact}>
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
          <Icon small={compact}>
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
