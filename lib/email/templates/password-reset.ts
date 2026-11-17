import { baseEmailHtml, buttonHtml } from "./base";

export function passwordResetEmail(locale: string, resetUrl: string) {
  const isRo = locale !== "en";

  const subject = isRo
    ? "Resetare parolă — iDesignStudio.ro"
    : "Password reset — iDesignStudio.ro";

  const body = isRo
    ? `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Resetare parolă</h1>
       <p style="margin:0;">Am primit o cerere de resetare a parolei pentru contul tău. Apasă butonul de mai jos ca să alegi o parolă nouă. Linkul expiră în 1 oră.</p>
       ${buttonHtml(resetUrl, "Resetează parola")}
       <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Dacă nu ai cerut tu acest lucru, poți ignora acest email în siguranță.</p>`
    : `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Password reset</h1>
       <p style="margin:0;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
       ${buttonHtml(resetUrl, "Reset password")}
       <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">If you didn't request this, you can safely ignore this email.</p>`;

  return { subject, html: baseEmailHtml(body) };
}
