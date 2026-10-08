import { baseEmailHtml } from "./base";
import { escapeHtml } from "../html";
import { formatPrice } from "@/lib/format";

type OrderConfirmationInput = {
  locale: string;
  orderId: string;
  items: { nameSnapshot: string; quantity: number; unitPriceCents: number }[];
  shippingCents: number;
  codFeeCents: number;
  totalCents: number;
  currency: string;
  paymentMethod: "CARD" | "COD";
};

export function orderConfirmationEmail(input: OrderConfirmationInput) {
  const { locale, orderId, items, shippingCents, codFeeCents, totalCents } =
    input;
  const { currency, paymentMethod } = input;
  const isRo = locale !== "en";
  const isCod = paymentMethod === "COD";
  const shortId = orderId.slice(0, 8);
  const money = (cents: number) => formatPrice(cents, currency, locale);

  const subject = isRo
    ? isCod
      ? `Comanda ta #${shortId} a fost inregistrata`
      : `Comanda ta #${shortId} a fost confirmata`
    : isCod
      ? `Your order #${shortId} has been received`
      : `Your order #${shortId} is confirmed`;

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;">${escapeHtml(item.nameSnapshot)} &times; ${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;text-align:right;">${money(item.unitPriceCents * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  const shippingLabel = isRo ? "Livrare" : "Shipping";
  const shippingValue =
    shippingCents === 0 ? (isRo ? "Gratuit" : "Free") : money(shippingCents);
  const codRow =
    codFeeCents > 0
      ? `<tr><td style="padding:8px 0;">${isRo ? "Taxa ramburs" : "Cash on delivery fee"}</td><td style="padding:8px 0;text-align:right;">${money(codFeeCents)}</td></tr>`
      : "";

  const tableBody = `${rows}
         <tr><td style="padding:8px 0;">${shippingLabel}</td><td style="padding:8px 0;text-align:right;">${shippingValue}</td></tr>
         ${codRow}
         <tr><td style="padding-top:12px;font-weight:600;">Total</td><td style="padding-top:12px;font-weight:600;text-align:right;">${money(totalCents)}</td></tr>`;

  const intro = isRo
    ? isCod
      ? `Comanda #${shortId} a fost inregistrata. Platesti curierului, in numerar, ${money(totalCents)} la primirea coletului. Produsele sunt facute la comanda; te vom anunta cand pleaca spre tine.`
      : `Comanda #${shortId} a fost confirmata. Produsele sunt facute la comanda; te vom anunta cand pleaca spre tine.`
    : isCod
      ? `Order #${shortId} has been received. You pay the courier ${money(totalCents)} in cash when the parcel arrives. Items are made to order; we will let you know when they ship.`
      : `Order #${shortId} is confirmed. Items are made to order; we will let you know when they ship.`;

  const heading = isRo ? "Multumim pentru comanda!" : "Thank you for your order!";

  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">${heading}</h1>
       <p style="margin:0 0 16px;">${intro}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${tableBody}
       </table>`;

  return { subject, html: baseEmailHtml(body) };
}
