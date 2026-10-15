import { baseEmailHtml, buttonHtml } from "./base";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function adminInviteEmail(username: string, url: string) {
  const subject = "Cont de administrare iDesignStudio.ro";
  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Salut, ${esc(username)}!</h1>
    <p style="margin:0;">Ai primit un cont în panoul de administrare iDesignStudio.ro, cu numele de utilizator <strong>${esc(username)}</strong>. Apasă butonul de mai jos și alege-ți parola. O știi doar tu.</p>
    ${buttonHtml(url, "Alege parola")}
    <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Linkul expiră în 7 zile și poate fi folosit o singură dată. Dacă nu te aștepți la acest e-mail, ignoră-l.</p>`;
  return { subject, html: baseEmailHtml(body) };
}

export function adminResetEmail(username: string, url: string) {
  const subject = "Resetare parolă admin — iDesignStudio.ro";
  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Resetare parolă admin</h1>
    <p style="margin:0;">Pentru contul <strong>${esc(username)}</strong> din panoul de administrare iDesignStudio.ro s-a cerut o parolă nouă. Apasă butonul de mai jos ca să o alegi. Linkul expiră în 1 oră și poate fi folosit o singură dată.</p>
    ${buttonHtml(url, "Alege o parolă nouă")}
    <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Dacă nu ai cerut tu acest lucru, ignoră e-mailul: parola actuală rămâne neschimbată.</p>`;
  return { subject, html: baseEmailHtml(body) };
}

export function adminNewDeviceEmail(
  username: string,
  when: string,
  device: string,
  ip: string,
) {
  const subject = "Conectare nouă în panoul de administrare";
  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Conectare de pe un dispozitiv nou</h1>
    <p style="margin:0;">Contul <strong>${esc(username)}</strong> din panoul de administrare iDesignStudio.ro s-a conectat de pe un dispozitiv nou.</p>
    <p style="margin:12px 0 0;">Când: ${esc(when)}<br>Dispozitiv: ${esc(device)}<br>Adresa IP: ${esc(ip)}</p>
    <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Dacă ai fost tu, nu trebuie să faci nimic. Dacă nu ai fost tu, schimbă parola (pagina de conectare, „Am uitat parola”) și anunță-l pe celălalt administrator.</p>`;
  return { subject, html: baseEmailHtml(body) };
}

export function adminAccountChangedEmail(username: string, what: string) {
  const subject = "Modificare cont de administrare";
  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Modificare cont</h1>
    <p style="margin:0;">Contul <strong>${esc(username)}</strong> din panoul de administrare iDesignStudio.ro: ${esc(what)}.</p>`;
  return { subject, html: baseEmailHtml(body) };
}
