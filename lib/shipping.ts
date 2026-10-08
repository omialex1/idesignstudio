export const SHIPPING_FEE_CENTS = 1999;
export const COD_FEE_CENTS = 399;
export const FREE_SHIPPING_THRESHOLD_CENTS = 20000;

export function calculateShippingCents(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
}
