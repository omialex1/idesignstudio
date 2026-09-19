import { baseEmailHtml } from "./base";
import { formatPrice } from "@/lib/format";

type OrderConfirmationItem = {
  nameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
};

// Not called anywhere yet — there is no real "order paid" trigger until the
// Netopia checkout + webhook (Phase 8) exists. Built and ready for that
// handler to call once it's wired up.
export function orderConfirmationEmail(
  locale: string,
  orderId: string,
  items: OrderConfirmationItem[],
  totalCents: number,
  currency: string,
) {
  const isRo = locale !== "en";

  const subject = isRo
    ? `Comanda ta #${orderId.slice(0, 8)} a fost confirmata`
    : `Your order #${orderId.slice(0, 8)} is confirmed`;

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;">${item.nameSnapshot} &times; ${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;text-align:right;">${formatPrice(item.unitPriceCents * item.quantity, currency, locale)}</td>
      </tr>`,
    )
    .join("");

  const body = isRo
    ? `<h1 style="font-size:20px;color:#4F3527;margin:0 0 12px;">Multumim pentru comanda!</h1>
       <p style="margin:0 0 16px;">Comanda #${orderId.slice(0, 8)} a fost confirmata.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}
         <tr><td style="padding-top:12px;font-weight:600;">Total</td><td style="padding-top:12px;font-weight:600;text-align:right;">${formatPrice(totalCents, currency, locale)}</td></tr>
       </table>`
    : `<h1 style="font-size:20px;color:#4F3527;margin:0 0 12px;">Thank you for your order!</h1>
       <p style="margin:0 0 16px;">Order #${orderId.slice(0, 8)} is confirmed.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}
         <tr><td style="padding-top:12px;font-weight:600;">Total</td><td style="padding-top:12px;font-weight:600;text-align:right;">${formatPrice(totalCents, currency, locale)}</td></tr>
       </table>`;

  return { subject, html: baseEmailHtml(body) };
}
