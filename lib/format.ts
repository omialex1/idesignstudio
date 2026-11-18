export function formatPrice(
  priceCents: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

// Like formatPrice, but a whole amount has no decimals (250 RON, not 250,00 RON).
export function formatPriceShort(
  priceCents: number,
  currency: string,
  locale: string,
): string {
  const whole = priceCents % 100 === 0;
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(priceCents / 100);
}
