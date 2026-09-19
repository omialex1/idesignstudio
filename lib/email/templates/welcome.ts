import { baseEmailHtml } from "./base";

export function welcomeEmail(locale: string, name: string) {
  const isRo = locale !== "en";

  const subject = isRo
    ? "Bine ai venit la iDesignStudio.ro!"
    : "Welcome to iDesignStudio.ro!";

  const body = isRo
    ? `<h1 style="font-size:20px;color:#4F3527;margin:0 0 12px;">Bine ai venit, ${name}!</h1>
       <p style="margin:0;">Contul tau a fost creat cu succes. De acum poti urmari comenzile tale direct din contul tau, oricand.</p>`
    : `<h1 style="font-size:20px;color:#4F3527;margin:0 0 12px;">Welcome, ${name}!</h1>
       <p style="margin:0;">Your account has been created successfully. You can now track your orders from your account, anytime.</p>`;

  return { subject, html: baseEmailHtml(body) };
}
