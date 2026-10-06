import { baseEmailHtml } from "./base";

export type WithdrawalRequest = {
  name: string;
  email: string;
  orderNumber: string;
  products: string;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#9C8F85;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;color:#3D332E;">${escapeHtml(value)}</td>
  </tr>`;
}

export function withdrawalBusinessEmail(request: WithdrawalRequest) {
  const subject = `Cerere de retragere din contract — comanda ${request.orderNumber}`;

  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Cerere de retragere din contract</h1>
    <p style="margin:0 0 16px;">A fost trimisă o cerere de retragere prin formularul online de pe site.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${detailRow("Nume", request.name)}
      ${detailRow("Email", request.email)}
      ${detailRow("Număr comandă", request.orderNumber)}
      ${detailRow("Produse vizate", request.products)}
      ${request.message ? detailRow("Mesaj", request.message) : ""}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Clientul a primit automat o confirmare de primire pe email.</p>`;

  return { subject, html: baseEmailHtml(body) };
}

export function withdrawalAcknowledgementEmail(
  locale: string,
  request: WithdrawalRequest,
) {
  const isRo = locale !== "en";

  const subject = isRo
    ? "Confirmare de primire — cerere de retragere"
    : "Acknowledgement of receipt — withdrawal request";

  const body = isRo
    ? `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Am primit cererea ta de retragere</h1>
       <p style="margin:0 0 16px;">Îți confirmăm că am primit cererea de retragere din contract pentru comanda <strong>${escapeHtml(request.orderNumber)}</strong>. Te vom contacta în curând cu pașii următori.</p>
       <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
         ${detailRow("Nume", request.name)}
         ${detailRow("Produse vizate", request.products)}
       </table>
       <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Păstrează acest email ca dovadă a cererii tale.</p>`
    : `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">We received your withdrawal request</h1>
       <p style="margin:0 0 16px;">We confirm that we received your request to withdraw from the contract for order <strong>${escapeHtml(request.orderNumber)}</strong>. We will contact you shortly with the next steps.</p>
       <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
         ${detailRow("Name", request.name)}
         ${detailRow("Products concerned", request.products)}
       </table>
       <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Keep this email as proof of your request.</p>`;

  return { subject, html: baseEmailHtml(body) };
}
