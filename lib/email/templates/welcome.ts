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
      ? `<p style="margin:16px 0 0;">Confirmă-ți adresa de e-mail apăsând butonul de mai jos. Așa îți legăm de cont și comenzile pe care le-ai făcut fără cont, cu această adresă. Linkul este valabil 24 de ore.</p>
         ${buttonHtml(verifyUrl, "Confirmă e-mailul")}`
      : `<p style="margin:16px 0 0;">Confirm your e-mail address with the button below. That also connects any orders you placed without an account using this address. The link is valid for 24 hours.</p>
         ${buttonHtml(verifyUrl, "Confirm e-mail")}`
    : "";

  const body = isRo
    ? `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Bine ai venit, ${safeName}!</h1>
       <p style="margin:0;">Contul tău a fost creat cu succes. De acum poți urmări comenzile direct din cont, oricând.</p>${verify}`
    : `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Welcome, ${safeName}!</h1>
       <p style="margin:0;">Your account has been created successfully. You can now track your orders from your account, anytime.</p>${verify}`;

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
