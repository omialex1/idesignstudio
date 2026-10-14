import { baseEmailHtml } from "./base";

// Sent after the password was changed or reset, so the owner notices if it was
// not them.
export function passwordChangedEmail(locale: string) {
  const isRo = locale !== "en";

  const subject = isRo
    ? "Parola contului tău a fost schimbată — iDesignStudio.ro"
    : "Your account password was changed — iDesignStudio.ro";

  const body = isRo
    ? `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Parola a fost schimbată</h1>
       <p style="margin:0;">Parola contului tău de pe iDesignStudio.ro tocmai a fost schimbată, iar celelalte dispozitive au fost deconectate.</p>
       <p style="margin:16px 0 0;">Dacă ai făcut tu schimbarea, nu trebuie să faci nimic. Dacă <strong>nu</strong> ai făcut-o tu, alege imediat o parolă nouă cu „Ai uitat parola?" și scrie-ne la <a href="mailto:contact@idesignstudio.ro" style="color:#C33F16;">contact@idesignstudio.ro</a>.</p>`
    : `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">Your password was changed</h1>
       <p style="margin:0;">The password of your iDesignStudio.ro account was just changed, and your other devices were signed out.</p>
       <p style="margin:16px 0 0;">If you made the change, you don't need to do anything. If it was <strong>not</strong> you, choose a new password right away with "Forgot password?" and write to us at <a href="mailto:contact@idesignstudio.ro" style="color:#C33F16;">contact@idesignstudio.ro</a>.</p>`;

  return { subject, html: baseEmailHtml(body) };
}
