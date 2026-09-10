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
