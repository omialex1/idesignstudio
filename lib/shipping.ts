export const SHIPPING_FEE_CENTS = 2499;
export const COD_FEE_CENTS = 599;
export const FREE_SHIPPING_THRESHOLD_CENTS = 25000;

export function calculateShippingCents(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
}

// How much more the customer has to add (after reductions) for free shipping; 0 when reached.
export function remainingForFreeShippingCents(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
}
