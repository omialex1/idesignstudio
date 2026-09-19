import { baseEmailHtml, buttonHtml } from "./base";

export function passwordResetEmail(locale: string, resetUrl: string) {
  const isRo = locale !== "en";

  const subject = isRo
    ? "Resetare parola — iDesignStudio.ro"
    : "Password reset — iDesignStudio.ro";

  const body = isRo
    ? `<h1 style="font-size:20px;color:#4F3527;margin:0 0 12px;">Resetare parola</h1>
       <p style="margin:0;">Am primit o cerere de resetare a parolei pentru contul tau. Apasa butonul de mai jos ca sa alegi o parola noua. Linkul expira in 1 ora.</p>
       ${buttonHtml(resetUrl, "Reseteaza parola")}
       <p style="margin:20px 0 0;font-size:13px;color:#8A6A54;">Daca nu ai cerut tu acest lucru, poti ignora acest email in siguranta.</p>`
    : `<h1 style="font-size:20px;color:#4F3527;margin:0 0 12px;">Password reset</h1>
       <p style="margin:0;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
       ${buttonHtml(resetUrl, "Reset password")}
       <p style="margin:20px 0 0;font-size:13px;color:#8A6A54;">If you didn't request this, you can safely ignore this email.</p>`;

  return { subject, html: baseEmailHtml(body) };
}
