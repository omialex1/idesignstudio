// Personal pickup from the studio.
export const PICKUP_STREET = "Str. Pictor Constantin Iliescu 1A";
export const PICKUP_CITY = "Râmnicu Vâlcea";
export const PICKUP_COUNTY = "Vâlcea";

// What an order without a delivery address holds in its address column, so lists, e-mails and
// the invoice can tell a pickup apart from a real address.
export const PICKUP_ADDRESS_MARK = "Ridicare personală";
export const PICKUP_ADDRESS_LINE = `${PICKUP_ADDRESS_MARK}: ${PICKUP_STREET}`;

export function isPickupPlaceholder(addressLine: string): boolean {
  return addressLine.startsWith(PICKUP_ADDRESS_MARK);
}
