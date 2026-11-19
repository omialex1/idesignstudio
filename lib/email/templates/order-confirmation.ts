import { baseEmailHtml, contactHtml } from "./base";
import { escapeHtml } from "../html";
import { formatPrice } from "@/lib/format";
import { PICKUP_STREET, PICKUP_CITY } from "@/lib/pickup";

type OrderConfirmationInput = {
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
  paymentMethod: "CARD" | "COD";
  // collected from the studio instead of delivered
  pickup?: boolean;
  // a discount code that waived the shipping (and maybe the cash-on-delivery fee)
  discountCode?: string | null;
  // link to this order in the customer's account (only for logged-in orders)
  orderUrl?: string;
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
      ? `Comanda ta #${shortId} a fost înregistrată`
      : `Comanda ta #${shortId} a fost confirmată`
    : isCod
      ? `Your order #${shortId} has been received`
      : `Your order #${shortId} is confirmed`;

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;">${escapeHtml(item.nameSnapshot)} &times; ${item.quantity}${item.details ? `<br><span style="font-size:12px;color:#85766A;">${escapeHtml(item.details)}</span>` : ""}</td>
        <td style="padding:8px 0;border-bottom:1px solid #EFE4D0;text-align:right;">${money(item.unitPriceCents * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  const pickup = input.pickup === true;
  const shippingLabel = pickup
    ? isRo
      ? "Ridicare personală"
      : "Personal pickup"
    : isRo
      ? "Livrare"
      : "Shipping";
  const shippingValue =
    shippingCents === 0 ? (isRo ? "Gratuit" : "Free") : money(shippingCents);
  const codeNote = input.discountCode
    ? `<tr><td colspan="2" style="padding:0 0 8px;font-size:12px;color:#85766A;">${isRo ? "Cod folosit" : "Code used"}: ${escapeHtml(input.discountCode)}</td></tr>`
    : "";
  const codRow =
    codFeeCents > 0
      ? `<tr><td style="padding:8px 0;">${isRo ? "Taxă ramburs" : "Cash on delivery fee"}</td><td style="padding:8px 0;text-align:right;">${money(codFeeCents)}</td></tr>`
      : "";

  const tableBody = `${rows}
         ${pickup ? "" : `<tr><td style="padding:8px 0;">${shippingLabel}</td><td style="padding:8px 0;text-align:right;">${shippingValue}</td></tr>`}
         ${codeNote}
         ${codRow}
         <tr><td style="padding-top:12px;font-weight:600;">Total</td><td style="padding-top:12px;font-weight:600;text-align:right;">${money(totalCents)}</td></tr>`;

  const place = `${PICKUP_STREET}, ${PICKUP_CITY}`;
  const intro = pickup
    ? isRo
      ? `Comanda #${shortId} a fost confirmată. O ridici personal de la ${place}. Produsele sunt făcute la comandă; îți scriem un email când sunt gata de ridicat.`
      : `Order #${shortId} is confirmed. You collect it in person at ${place}. Items are made to order; we will email you when it is ready for pickup.`
    : isRo
    ? isCod
      ? `Comanda #${shortId} a fost înregistrată. Plătești curierului, în numerar, ${money(totalCents)} la primirea coletului. Produsele sunt făcute la comandă; te vom anunța când pleacă spre tine.`
      : `Comanda #${shortId} a fost confirmată. Produsele sunt făcute la comandă; te vom anunța când pleacă spre tine.`
    : isCod
      ? `Order #${shortId} has been received. You pay the courier ${money(totalCents)} in cash when the parcel arrives. Items are made to order; we will let you know when they ship.`
      : `Order #${shortId} is confirmed. Items are made to order; we will let you know when they ship.`;

  const heading = isRo
    ? "Mulțumim pentru comandă!"
    : "Thank you for your order!";

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.idesignstudio.ro"
  ).replace(/\/$/, "");
  const withdrawalUrl = `${site}/${isRo ? "ro" : "en"}/withdrawal`;
  const withdrawalNote = isRo
    ? `Te poți retrage din contract în 14 zile de la primirea produselor (cu excepția celor personalizate), folosind <a href="${withdrawalUrl}" style="color:#C33F16;">formularul online de retragere</a>.`
    : `You can withdraw from the contract within 14 days of receiving the products (except personalized items) using the <a href="${withdrawalUrl}" style="color:#C33F16;">online withdrawal form</a>.`;

  const accountLink = input.orderUrl
    ? `<p style="margin:16px 0 0;font-size:14px;"><a href="${input.orderUrl}" style="color:#C33F16;">${isRo ? "Vezi comanda în contul tău" : "View this order in your account"}</a></p>`
    : "";

  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">${heading}</h1>
       <p style="margin:0 0 16px;">${intro}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${tableBody}
       </table>
       ${accountLink}
       ${contactHtml(isRo)}
       <p style="margin:20px 0 0;font-size:13px;color:#6B5D54;">${withdrawalNote}</p>`;

  return { subject, html: baseEmailHtml(body) };
}
