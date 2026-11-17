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
const sizeMd = "h-11 w-11";
const sizeSm = "h-10 w-10";

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
      className={small ? "h-5 w-5" : "h-[22px] w-[22px]"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function useProductActions(product: CardProduct) {
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

  return {
    favorite,
    toggle: () => toggle(product.id),
    add,
    justAdded,
    heartLabel: favorite ? t("removeFromFavorites") : t("addToFavorites"),
    cartLabel: justAdded ? tCart("added") : tCart("addToCart"),
    optionsLabel: t("chooseOptions"),
  };
}

const CART_PATHS = (
  <>
    <path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M15 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M17 17h-11v-14h-2" />
    <path d="M6 5l6.005 .429m7.138 6.573l-.143 .998h-13" />
    <path d="M15 6h6m-3 -3v6" />
  </>
);

// The colours of the buttons: black (the shop's dark brown) with cream; a favorite
// is a black heart button with a gold heart.
const heartIdle =
  "border border-choc/25 bg-cream-100 text-choc hover:bg-cream-200";
const heartOn = "bg-choc text-gold-300 hover:bg-taupe-700";
const cartDark = "bg-choc text-cream-50 shadow-sm hover:bg-taupe-700";

// The two round buttons of a small product card ("Noutăți", "Merge bine cu"): the heart
// (favorites, kept in the browser) and the cart. The cart adds the product at once when
// there is nothing to choose; otherwise it opens the product page.
export default function ProductActions({
  product,
  compact = false,
}: {
  product: CardProduct;
  // smaller buttons, for the narrow cards of "Merge bine cu"
  compact?: boolean;
}) {
  const base = `${roundBase} ${compact ? sizeSm : sizeMd}`;
  const a = useProductActions(product);

  return (
    <span className="flex items-center gap-2.5">
      <button
        type="button"
        aria-pressed={a.favorite}
        aria-label={a.heartLabel}
        title={a.heartLabel}
        onClick={a.toggle}
        className={`${base} ${a.favorite ? heartOn : heartIdle}`}
      >
        <Icon filled={a.favorite} small={compact}>
          <path d={HEART_PATH} />
        </Icon>
      </button>

      {product.quickAdd ? (
        <button
          type="button"
          aria-label={a.cartLabel}
          title={a.cartLabel}
          onClick={a.add}
          className={`${base} ${cartDark}`}
        >
          <Icon small={compact}>
            {a.justAdded ? <path d="M5 12l5 5l10 -10" /> : CART_PATHS}
          </Icon>
        </button>
      ) : (
        <Link
          href={product.href}
          aria-label={a.optionsLabel}
          title={a.optionsLabel}
          className={`${base} ${cartDark}`}
        >
          <Icon small={compact}>{CART_PATHS}</Icon>
        </Link>
      )}
    </span>
  );
}

// The bottom of a product card in the lists: the price, the heart and a big cart button
// with the words. Two layouts (the same three parts):
//  - on phones and tablets: the price and the heart on one line, the button alone below,
//    wide and tall;
//  - on desktop (lg and up): the price on top, then the heart and the button side by side.
// This block is always the bottom of the card (the card pins it there).
export function CardBuyBar({
  product,
  priceLabel,
  oldPriceLabel,
  stacked = false,
}: {
  product: CardProduct;
  priceLabel: string;
  oldPriceLabel?: string;
  // always the narrow layout (price and heart on a line, button below), also on a wide
  // screen: for the narrow cards of the rows "Noutăți" and "Merge bine cu"
  stacked?: boolean;
}) {
  const a = useProductActions(product);

  const heart = (
    <button
      type="button"
      aria-pressed={a.favorite}
      aria-label={a.heartLabel}
      title={a.heartLabel}
      onClick={a.toggle}
      className={`${roundBase} ${sizeMd} justify-self-end ${a.favorite ? heartOn : heartIdle} ${stacked ? "" : "lg:col-start-1 lg:row-start-2 lg:justify-self-start"}`}
    >
      <Icon filled={a.favorite}>
        <path d={HEART_PATH} />
      </Icon>
    </button>
  );

  const buttonClass = `flex h-12 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors ${stacked ? "px-2 text-[13px] sm:px-3 sm:text-sm" : "lg:col-span-1 lg:col-start-2 lg:row-start-2 lg:h-11"} ${cartDark}`;
  // the words on the button are always "Add to cart"; when there is something to choose
  // (variants, colours) the button opens the product page instead of adding at once
  const label = a.cartLabel;
  // split "de la 69,99 RON" / "from RON 69.99" into the small words and the price
  const fromMatch = /^(de la|from)\s+(.+)$/i.exec(priceLabel);
  const fromWords = fromMatch?.[1];
  const priceOnly = fromMatch ? fromMatch[2] : priceLabel;

  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-2.5 ${stacked ? "" : "lg:grid-cols-[auto_1fr]"}`}
    >
      <span
        className={`text-left text-[15px] leading-tight font-semibold text-choc sm:text-base ${stacked ? "" : "lg:col-span-2 lg:row-start-1 lg:text-center"}`}
      >
        {oldPriceLabel && (
          <span
            className={`block text-xs font-normal text-taupe-400 line-through ${stacked ? "" : "lg:mr-1.5 lg:inline"}`}
          >
            {oldPriceLabel}
          </span>
        )}
        {/* "de la 69,99 RON": the small words go above the price when the column is narrow */}
        {fromWords && (
          <span
            className={`block text-xs font-medium text-taupe-600 ${stacked ? "" : "lg:mr-1.5 lg:inline lg:text-base lg:leading-tight lg:font-semibold lg:text-choc"}`}
          >
            {fromWords}
          </span>
        )}
        {priceOnly}
      </span>
      {heart}
      {product.quickAdd ? (
        <button
          type="button"
          onClick={a.add}
          title={a.cartLabel}
          className={`${buttonClass} col-span-2`}
        >
          <Icon small>{a.justAdded ? <path d="M5 12l5 5l10 -10" /> : CART_PATHS}</Icon>
          {label}
        </button>
      ) : (
        <Link href={product.href} title={a.optionsLabel} className={`${buttonClass} col-span-2`}>
          <Icon small>{CART_PATHS}</Icon>
          {label}
        </Link>
      )}
    </div>
  );
}
