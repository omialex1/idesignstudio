import { baseEmailHtml, contactHtml } from "./base";
import { escapeHtml } from "../html";
import { formatPrice } from "@/lib/format";

// Sent to the customer after the studio changed the products of an order (for example after a
// phone call). Shows the order as it is now.
export function orderUpdatedEmail(input: {
  locale: string;
  orderId: string;
  items: {
    nameSnapshot: string;
    details?: string;
    quantity: number;
    unitPriceCents: number;
  }[];
  shippingCents: number;
  codFeeCents: number;
  totalCents: number;
  currency: string;
  pickup: boolean;
}) {
  const isRo = input.locale !== "en";
  const shortId = input.orderId.slice(0, 8);
  const money = (cents: number) => formatPrice(cents, input.currency, input.locale);

  const subject = isRo
    ? `Comanda ta #${shortId} a fost modificată`
    : `Your order #${shortId} has been updated`;

  const rows = input.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;">${escapeHtml(item.nameSnapshot)} &times; ${item.quantity}${item.details ? `<br><span style="font-size:12px;color:#85766A;">${escapeHtml(item.details)}</span>` : ""}</td>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;text-align:right;">${money(item.unitPriceCents * item.quantity)}</td>
      </tr>`,
    )
    .join("");
  const shippingLabel = input.pickup
    ? isRo ? "Ridicare personală" : "Personal pickup"
    : isRo ? "Livrare" : "Shipping";
  const shippingValue =
    input.shippingCents === 0 ? (isRo ? "Gratuit" : "Free") : money(input.shippingCents);
  const codRow =
    input.codFeeCents > 0
      ? `<tr><td style="padding:8px 0;">${isRo ? "Taxă ramburs" : "Cash on delivery fee"}</td><td style="padding:8px 0;text-align:right;">${money(input.codFeeCents)}</td></tr>`
      : "";

  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">${isRo ? "Comanda ta a fost modificată" : "Your order has been updated"}</h1>
    <p style="margin:0 0 16px;">${isRo ? `Am modificat comanda <strong>#${shortId}</strong>, conform discuției noastre. Iată cum arată acum:` : `We updated order <strong>#${shortId}</strong> as we discussed. Here is how it looks now:`}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}
      ${input.pickup ? "" : `<tr><td style="padding:8px 0;">${shippingLabel}</td><td style="padding:8px 0;text-align:right;">${shippingValue}</td></tr>`}
      ${codRow}
      <tr><td style="padding-top:12px;font-weight:600;">Total</td><td style="padding-top:12px;font-weight:600;text-align:right;">${money(input.totalCents)}</td></tr>
    </table>
    ${contactHtml(isRo)}`;

  return { subject, html: baseEmailHtml(body) };
}
