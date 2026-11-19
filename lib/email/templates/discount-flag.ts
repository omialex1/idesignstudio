import { baseEmailHtml } from "./base";
import { escapeHtml } from "../html";

// To the studio (contact@ and office@): someone tried to use a code a second time.
export function discountFlagEmail(input: {
  code: string;
  reasons: string[];
  matchedOrderIds: string[];
  name: string;
  email: string;
  phone: string;
}) {
  const subject = `Cod ${input.code} folosit a doua oară (blocat)`;
  const matched = input.matchedOrderIds.length
    ? input.matchedOrderIds.map((id) => `#${id.slice(0, 8)}`).join(", ")
    : "-";
  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Cod folosit a doua oară</h1>
    <p style="margin:0 0 12px;">Cineva a încercat să folosească din nou codul <strong>${escapeHtml(input.code)}</strong>. Codul nu a fost aplicat, iar clientul a primit mesaj că a mai fost folosit.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0;color:#9C8F85;">Potrivire</td><td style="padding:4px 0;color:#3D332E;"><strong>${escapeHtml(input.reasons.join(", "))}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#9C8F85;">Nume</td><td style="padding:4px 0;color:#3D332E;">${escapeHtml(input.name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#9C8F85;">Email</td><td style="padding:4px 0;color:#3D332E;">${escapeHtml(input.email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#9C8F85;">Telefon</td><td style="padding:4px 0;color:#3D332E;">${escapeHtml(input.phone)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#9C8F85;">Comenzi anterioare cu codul</td><td style="padding:4px 0;color:#3D332E;">${escapeHtml(matched)}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#6B5D54;">Poți vedea încercările și în admin, la pagina Coduri. Dacă e o greșeală (de exemplu două persoane din aceeași casă), contactează clientul.</p>`;
  return { subject, html: baseEmailHtml(body) };
}
