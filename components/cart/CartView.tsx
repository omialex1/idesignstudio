"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart/store";
import { formatPrice } from "@/lib/format";

export default function CartView() {
  const t = useTranslations("Cart");
  const locale = useLocale();
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  if (!hasHydrated) {
    return <div className="flex flex-1" />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-3xl text-brown-800">{t("title")}</h1>
        <p className="text-brown-600">{t("empty")}</p>
        <Link
          href="/"
          className="text-sm font-medium text-terracotta-600 hover:underline"
        >
          {t("continueShopping")}
        </Link>
      </div>
    );
  }

  const total = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );
  const currency = items[0].currency;

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-3xl text-brown-800">{t("title")}</h1>

        <div className="mt-8 flex flex-col gap-4">
          {items.map((item) => {
            const href =
              item.line === "EVENTS"
                ? `/events/${item.categorySlug}/${item.slug}`
                : `/stationary/${item.categorySlug}/${item.slug}`;

            return (
              <div
                key={item.productId}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-cream-200 bg-white p-4"
              >
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl font-display text-xl text-cream-50 ${
                    item.line === "EVENTS" ? "bg-terracotta-400" : "bg-brown-500"
                  }`}
                >
                  {item.nameSnapshot.charAt(0).toUpperCase()}
                </div>

                <div className="flex min-w-[8rem] flex-1 flex-col gap-1">
                  <Link
                    href={href}
                    className="font-medium text-brown-800 hover:underline"
                  >
                    {item.nameSnapshot}
                  </Link>
                  <span className="text-sm text-brown-600">
                    {formatPrice(item.priceCents, item.currency, locale)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="h-7 w-7 rounded-full border border-cream-200 text-brown-700 hover:bg-cream-100"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="h-7 w-7 rounded-full border border-cream-200 text-brown-700 hover:bg-cream-100"
                  >
                    +
                  </button>
                </div>

                <span className="w-24 text-right font-medium text-brown-800">
                  {formatPrice(
                    item.priceCents * item.quantity,
                    item.currency,
                    locale,
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="text-xs font-medium text-brown-400 hover:text-red-600"
                >
                  {t("remove")}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-end gap-2 border-t border-cream-200 pt-6">
          <div className="flex items-center gap-4 text-lg font-semibold text-brown-800">
            <span>{t("total")}</span>
            <span>{formatPrice(total, currency, locale)}</span>
          </div>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full bg-brown-300 px-8 py-3 text-sm font-semibold text-cream-50 opacity-70"
          >
            {t("checkout")}
          </button>
          <p className="text-xs text-brown-400">{t("checkoutComingSoon")}</p>
        </div>
      </div>
    </div>
  );
}
