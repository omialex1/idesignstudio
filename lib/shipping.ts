export const SHIPPING_FEE_CENTS = 2000;
export const FREE_SHIPPING_THRESHOLD_CENTS = 25000;

export function calculateShippingCents(subtotalCents: number): number {
  return subtotalCents > FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
}
