"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatPriceShort } from "@/lib/format";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  remainingForFreeShippingCents,
} from "@/lib/shipping";

export function TruckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 6.5h11v9h-11z" />
      <path d="M13.5 9.5h4l3 3v3h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

// "X left until free shipping" with a thin progress line; once the threshold is reached it
// says the order ships free. `compact` drops the card (for the checkout summary).
export default function FreeShippingProgress({
  subtotalCents,
  currency,
  compact = false,
  className = "",
}: {
  subtotalCents: number;
  currency: string;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("Shipping");
  const locale = useLocale();
  const left = remainingForFreeShippingCents(subtotalCents);
  const reached = left === 0;
  const percent = Math.min(
    100,
    Math.round((subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100),
  );

  return (
    <div
      className={`${
        compact
          ? ""
          : "rounded-2xl border border-gold-600/40 bg-paper px-4 py-3 shadow-[0_6px_20px_rgba(60,40,25,0.06)]"
      } ${className}`}
    >
      <p
        className={`flex items-center gap-2 text-taupe-800 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        <TruckIcon
          className={`shrink-0 ${reached ? "text-salamander-600" : "text-gold-600"} ${
            compact ? "h-4 w-4" : "h-5 w-5"
          }`}
        />
        <span>
          {reached
            ? t("reached")
            : t.rich("remaining", {
                amount: formatPriceShort(left, currency, locale),
                b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
              })}
        </span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={`overflow-hidden rounded-full bg-cream-200 ${
          compact ? "mt-1.5 h-1.5" : "mt-2.5 h-2"
        }`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            reached ? "bg-salamander-500" : "bg-gold-600"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
