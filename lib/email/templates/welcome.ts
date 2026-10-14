import { baseEmailHtml, buttonHtml } from "./base";
import { escapeHtml } from "../html";

export function welcomeEmail(locale: string, name: string, verifyUrl?: string) {
  const isRo = locale !== "en";
  const safeName = escapeHtml(name);

  const subject = isRo
    ? "Bine ai venit la iDesignStudio.ro!"
    : "Welcome to iDesignStudio.ro!";

  const verify = verifyUrl
    ? isRo
      ? `<p style="margin:16px 0 0;">Apasă butonul de mai jos ca să-ți activezi contul. Până nu confirmi adresa de e-mail, nu te poți conecta. După confirmare ești conectat automat, iar comenzile pe care le-ai făcut fără cont cu această adresă apar și în cont. Linkul este valabil 24 de ore.</p>
         ${buttonHtml(verifyUrl, "Activează contul")}`
      : `<p style="margin:16px 0 0;">Click the button below to activate your account. Until you confirm your e-mail address you cannot log in. After confirming you are logged in automatically, and any orders you placed without an account using this address also show up in your account. The link is valid for 24 hours.</p>
         ${buttonHtml(verifyUrl, "Activate account")}`
    : "";

  const body = isRo
    ? `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Bine ai venit, ${safeName}!</h1>
       <p style="margin:0;">Contul tău a fost creat. După activare poți urmări comenzile direct din cont, oricând.</p>${verify}`
    : `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Welcome, ${safeName}!</h1>
       <p style="margin:0;">Your account has been created. Once activated you can track your orders from your account, anytime.</p>${verify}`;

  return { subject, html: baseEmailHtml(body) };
}

// Sent when the customer asks for the confirmation link again.
export function verifyEmailEmail(
  locale: string,
  name: string,
  verifyUrl: string,
) {
  const isRo = locale !== "en";
  const safeName = escapeHtml(name);

  const subject = isRo
    ? "Confirmă adresa de e-mail — iDesignStudio.ro"
    : "Confirm your e-mail address — iDesignStudio.ro";

  const body = isRo
    ? `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Confirmă e-mailul</h1>
       <p style="margin:0;">Salut, ${safeName}! Apasă butonul de mai jos ca să îți confirmi adresa de e-mail. Linkul este valabil 24 de ore.</p>
       ${buttonHtml(verifyUrl, "Confirmă e-mailul")}
       <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Dacă nu ai creat tu un cont, poți ignora acest mesaj.</p>`
    : `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Confirm your e-mail</h1>
       <p style="margin:0;">Hi ${safeName}! Click the button below to confirm your e-mail address. The link is valid for 24 hours.</p>
       ${buttonHtml(verifyUrl, "Confirm e-mail")}
       <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">If you didn't create an account, you can ignore this message.</p>`;

  return { subject, html: baseEmailHtml(body) };
}
