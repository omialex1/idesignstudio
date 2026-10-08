import { baseEmailHtml } from "./base";
import { escapeHtml } from "../html";
import { formatPrice } from "@/lib/format";

type NewOrderEmailInput = {
  orderId: string;
  customerEmail: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  county: string;
  postalCode: string;
  notes: string | null;
  companyName: string | null;
  companyCui: string | null;
  items: { nameSnapshot: string; quantity: number; unitPriceCents: number }[];
  shippingCents: number;
  codFeeCents: number;
  paymentMethod: "CARD" | "COD";
  totalCents: number;
  currency: string;
};

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 12px 4px 0;color:#9C8F85;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:4px 0;color:#3D332E;">${escapeHtml(value)}</td>
  </tr>`;
}

export function newOrderBusinessEmail(order: NewOrderEmailInput) {
  const shortId = order.orderId.slice(0, 8);
  const isCod = order.paymentMethod === "COD";
  const subject = isCod
    ? `Comandă nouă RAMBURS #${shortId} — de încasat ${formatPrice(order.totalCents, order.currency, "ro")}`
    : `Comandă nouă plătită #${shortId} — ${formatPrice(order.totalCents, order.currency, "ro")}`;

  const itemRows = order.items
    .map(
      (item) =>
        `<li style="margin:2px 0;">${escapeHtml(item.nameSnapshot)} &times; ${item.quantity} — ${formatPrice(item.unitPriceCents * item.quantity, order.currency, "ro")}</li>`,
    )
    .join("");

  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">${isCod ? "Comandă nouă cu ramburs" : "Comandă nouă plătită"}</h1>
    <p style="margin:0 0 16px;">Comanda <strong>#${shortId}</strong> ${isCod ? `se plătește <strong>ramburs, la livrare</strong>. De încasat de la client prin curier: <strong>${formatPrice(order.totalCents, order.currency, "ro")}</strong>.` : "a fost plătită cu cardul."}</p>
    <h2 style="font-size:15px;color:#3D332E;margin:16px 0 6px;">Produse</h2>
    <ul style="margin:0;padding-left:18px;">${itemRows}</ul>
    <p style="margin:8px 0 0;">Livrare: ${order.shippingCents === 0 ? "gratuită" : formatPrice(order.shippingCents, order.currency, "ro")}${order.codFeeCents > 0 ? `<br>Taxă ramburs: ${formatPrice(order.codFeeCents, order.currency, "ro")}` : ""}<br><strong>Total: ${formatPrice(order.totalCents, order.currency, "ro")}</strong></p>
    <h2 style="font-size:15px;color:#3D332E;margin:20px 0 6px;">Client și livrare</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${row("Nume", `${order.firstName} ${order.lastName}`)}
      ${row("Email", order.customerEmail)}
      ${row("Telefon", order.phone)}
      ${row("Adresă", order.addressLine)}
      ${row("Oraș", order.city)}
      ${row("Județ", order.county)}
      ${row("Cod poștal", order.postalCode)}
      ${order.notes ? row("Observații", order.notes) : ""}
    </table>
    ${
      order.companyName
        ? `<h2 style="font-size:15px;color:#3D332E;margin:20px 0 6px;">Factură pe firmă</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${row("Denumire", order.companyName)}
      ${row("CUI", order.companyCui ?? "")}
    </table>`
        : ""
    }`;

  return { subject, html: baseEmailHtml(body) };
}
