import { baseEmailHtml } from "./base";
import { escapeHtml } from "../html";
import { formatPrice } from "@/lib/format";

type OrderConfirmationItem = {
  nameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
};

export function orderConfirmationEmail(
  locale: string,
  orderId: string,
  items: OrderConfirmationItem[],
  shippingCents: number,
  totalCents: number,
  currency: string,
) {
  const isRo = locale !== "en";
  const shortId = orderId.slice(0, 8);

  const subject = isRo
    ? `Comanda ta #${shortId} a fost confirmata`
    : `Your order #${shortId} is confirmed`;

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;">${escapeHtml(item.nameSnapshot)} &times; ${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;text-align:right;">${formatPrice(item.unitPriceCents * item.quantity, currency, locale)}</td>
      </tr>`,
    )
    .join("");

  const shippingLabel = isRo ? "Livrare" : "Shipping";
  const shippingValue =
    shippingCents === 0
      ? isRo
        ? "Gratuit"
        : "Free"
      : formatPrice(shippingCents, currency, locale);

  const tableBody = `${rows}
         <tr><td style="padding:8px 0;">${shippingLabel}</td><td style="padding:8px 0;text-align:right;">${shippingValue}</td></tr>
         <tr><td style="padding-top:12px;font-weight:600;">Total</td><td style="padding-top:12px;font-weight:600;text-align:right;">${formatPrice(totalCents, currency, locale)}</td></tr>`;

  const body = isRo
    ? `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Multumim pentru comanda!</h1>
       <p style="margin:0 0 16px;">Comanda #${shortId} a fost confirmata. Produsele sunt facute la comanda; te vom anunta cand pleaca spre tine.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${tableBody}
       </table>`
    : `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Thank you for your order!</h1>
       <p style="margin:0 0 16px;">Order #${shortId} is confirmed. Items are made to order; we will let you know when they ship.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${tableBody}
       </table>`;

  return { subject, html: baseEmailHtml(body) };
}
