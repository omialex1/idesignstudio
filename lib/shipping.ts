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

// What an order costs on top of its products. Used by the checkout page (the live
// total), the checkout API (the real one) and the admin when an order is edited, so the
// three always agree.
//  - pickup: no shipping and no cash-on-delivery fee (and no discount code is needed).
//  - a free-shipping code waives the shipping, and the cash-on-delivery fee too when the
//    code says so; `discountCents` is the sum of what was waived.
export function orderCharges(input: {
  subtotalCents: number;
  pickup: boolean;
  cod: boolean;
  code?: { removesCodFee: boolean } | null;
}): {
  shippingCents: number;
  codFeeCents: number;
  discountCents: number;
  totalCents: number;
} {
  const baseShipping = input.pickup
    ? 0
    : calculateShippingCents(input.subtotalCents);
  const baseCodFee = input.cod && !input.pickup ? COD_FEE_CENTS : 0;
  const code = input.pickup ? null : input.code;

  const shippingCents = code ? 0 : baseShipping;
  const codFeeCents = code?.removesCodFee ? 0 : baseCodFee;
  const discountCents =
    (baseShipping - shippingCents) + (baseCodFee - codFeeCents);
  return {
    shippingCents,
    codFeeCents,
    discountCents,
    totalCents: input.subtotalCents + shippingCents + codFeeCents,
  };
}
