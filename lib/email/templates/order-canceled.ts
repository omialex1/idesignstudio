import { baseEmailHtml } from "./base";
import { formatPrice } from "@/lib/format";

type OrderCanceledInput = {
  locale: string;
  orderId: string;
  paymentMethod: "CARD" | "COD";
  // true when the customer already paid by card, so money has to be returned
  wasPaid: boolean;
  totalCents: number;
  currency: string;
};

export function orderCanceledEmail(input: OrderCanceledInput) {
  const { locale, orderId, paymentMethod, wasPaid, totalCents, currency } =
    input;
  const isRo = locale !== "en";
  const shortId = orderId.slice(0, 8);
  const amount = formatPrice(totalCents, currency, locale);

  const subject = isRo
    ? `Comanda ta #${shortId} a fost anulata`
    : `Your order #${shortId} has been canceled`;

  const heading = isRo ? "Comanda a fost anulată" : "Your order was canceled";

  const intro = isRo
    ? `Comanda #${shortId} a fost anulată. Ne pare rău pentru neplăcere.`
    : `Order #${shortId} has been canceled. We are sorry for the inconvenience.`;

  const money = !wasPaid
    ? isRo
      ? paymentMethod === "COD"
        ? "Nu ai plătit nimic și nu trebuie să plătești curierului."
        : "Nu s-a retras nicio sumă din contul tău."
      : paymentMethod === "COD"
        ? "You have not paid anything and you do not need to pay the courier."
        : "No money was taken from your account."
    : isRo
      ? `Ai plătit ${amount} cu cardul. Îți returnăm suma pe același card. Cât durează până apare în cont depinde de banca ta, de obicei câteva zile lucrătoare.`
      : `You paid ${amount} by card. We will return the amount to the same card. How long it takes to appear depends on your bank, usually a few working days.`;

  const contact = isRo
    ? 'Dacă ai întrebări, scrie-ne la <a href="mailto:contact@idesignstudio.ro" style="color:#C33F16;">contact@idesignstudio.ro</a>.'
    : 'If you have questions, write to us at <a href="mailto:contact@idesignstudio.ro" style="color:#C33F16;">contact@idesignstudio.ro</a>.';

  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">${heading}</h1>
       <p style="margin:0 0 16px;">${intro}</p>
       <p style="margin:0 0 16px;">${money}</p>
       <p style="margin:20px 0 0;font-size:13px;color:#6B5D54;">${contact}</p>`;

  return { subject, html: baseEmailHtml(body) };
}
