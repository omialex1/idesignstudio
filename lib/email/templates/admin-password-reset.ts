import { baseEmailHtml, buttonHtml } from "./base";

export function adminPasswordResetEmail(resetUrl: string) {
  const subject = "Resetare parola admin — iDesignStudio.ro";

  const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Resetare parola admin</h1>
    <p style="margin:0;">Cineva a cerut resetarea parolei pentru panoul de administrare iDesignStudio.ro. Apasa butonul de mai jos ca sa alegi o parola noua. Linkul expira in 1 ora si poate fi folosit o singura data.</p>
    ${buttonHtml(resetUrl, "Alege o parola noua")}
    <p style="margin:20px 0 0;font-size:13px;color:#9C8F85;">Daca nu ai cerut tu acest lucru, ignora acest email: parola actuala ramane neschimbata.</p>`;

  return { subject, html: baseEmailHtml(body) };
}
