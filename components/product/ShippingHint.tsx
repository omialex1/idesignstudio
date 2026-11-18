"use client";

import { useLocale, useTranslations } from "next-intl";
import { TruckIcon } from "@/components/cart/FreeShippingProgress";
import { useCartStore } from "@/lib/cart/store";
import { formatPriceShort } from "@/lib/format";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  remainingForFreeShippingCents,
} from "@/lib/shipping";

// One line under the price. With an empty cart it states the rule; with things in the cart it
// says how much is still missing (or that the order already ships free).
export default function ShippingHint({ currency }: { currency: string }) {
  const t = useTranslations("Shipping");
  const locale = useLocale();
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const items = useCartStore((s) => s.items);
  const subtotal = hasHydrated
    ? items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
    : 0;
  const left = remainingForFreeShippingCents(subtotal);

  return (
    <p className="flex items-center gap-2 text-sm text-taupe-600">
      <TruckIcon className="h-5 w-5 shrink-0 text-gold-600" />
      <span>
        {subtotal === 0
          ? t("freeFrom", {
              amount: formatPriceShort(
                FREE_SHIPPING_THRESHOLD_CENTS,
                currency,
                locale,
              ),
            })
          : left === 0
            ? t("reached")
            : t.rich("remaining", {
                amount: formatPriceShort(left, currency, locale),
                b: (chunks) => (
                  <strong className="font-semibold text-taupe-800">{chunks}</strong>
                ),
              })}
      </span>
    </p>
  );
}
