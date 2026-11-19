import { baseEmailHtml, contactHtml } from "./base";
import { PICKUP_STREET, PICKUP_CITY } from "@/lib/pickup";

// Sent to the customer when the order is ready to be collected from the studio.
export function orderPickupReadyEmail(input: {
  locale: string;
  orderId: string;
}) {
  const isRo = input.locale !== "en";
  const shortId = input.orderId.slice(0, 8);
  const place = `${PICKUP_STREET}, ${PICKUP_CITY}`;

  const subject = isRo
    ? `Comanda ta #${shortId} este gata de ridicat`
    : `Your order #${shortId} is ready for pickup`;

  const body = isRo
    ? `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Comanda ta e gata!</h1>
       <p style="margin:0 0 12px;">Comanda <strong>#${shortId}</strong> este gata de ridicat de la <strong>${place}</strong>.</p>
       <p style="margin:0;">Dacă vrei să stabilim ziua și ora, sună-ne sau răspunde la acest email.</p>${contactHtml(true)}`
    : `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Your order is ready!</h1>
       <p style="margin:0 0 12px;">Order <strong>#${shortId}</strong> is ready to be collected at <strong>${place}</strong>.</p>
       <p style="margin:0;">To agree on a day and time, call us or reply to this email.</p>${contactHtml(false)}`;

  return { subject, html: baseEmailHtml(body) };
}
