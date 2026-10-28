import { sendEmail } from "@/lib/email/client";
import { baseEmailHtml } from "@/lib/email/templates/base";
import { officeEmail } from "@/lib/admin/users";
import { HOUR, checkRateLimits } from "@/lib/security/rate-limit";

// Alerts to the office mailbox when something goes wrong that nobody would
// otherwise notice (a card payment that cannot start, a notification from
// Netopia that is rejected, an invoice that was not made, a server error).
//
// - Never throws: an alert problem must not break the thing being reported.
// - Throttled: the same alert is sent at most once per `throttleMs`, so a
//   problem that repeats a hundred times is one e-mail, not a hundred.
// - Only sent from the live site (Vercel production), never while developing.
// - No customer data in the text: only what is needed to find the problem.

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function live() {
  return process.env.VERCEL_ENV === "production";
}

export async function sendAlert({
  key,
  subject,
  lines,
  throttleMs = HOUR,
}: {
  // same key = same alert, for the throttle
  key: string;
  subject: string;
  lines: string[];
  throttleMs?: number;
}) {
  try {
    if (!live()) {
      console.warn(`[alert, not sent outside production] ${subject}`, lines);
      return;
    }
    const to = officeEmail();
    if (!to) return;

    const wait = await checkRateLimits([
      { action: `alert-${key}`, id: "all", limit: 1, windowMs: throttleMs },
    ]);
    if (wait) return;

    const body = `<h1 style="font-size:20px;color:#3D332E;margin:0 0 12px;">${esc(subject)}</h1>
      ${lines.map((l) => `<p style="margin:0 0 8px;">${esc(l)}</p>`).join("")}
      <p style="margin:16px 0 0;font-size:13px;color:#9C8F85;">Alertă automată de pe www.idesignstudio.ro. Același tip de alertă nu se trimite mai des de o dată pe oră.</p>`;
    await sendEmail({
      to,
      subject: `[iDesignStudio alertă] ${subject}`,
      html: baseEmailHtml(body),
    });
  } catch (err) {
    console.error("Could not send an alert", err);
  }
}

// For problems that only matter when they repeat: counts each event and sends the
// alert once `threshold` of them happen inside `windowMs`.
export async function noteFailure({
  key,
  threshold,
  windowMs = HOUR,
  subject,
  lines,
}: {
  key: string;
  threshold: number;
  windowMs?: number;
  subject: string;
  lines: string[];
}) {
  try {
    const over = await checkRateLimits([
      {
        action: `alertcount-${key}`,
        id: "all",
        limit: threshold - 1,
        windowMs,
      },
    ]);
    if (over) await sendAlert({ key, subject, lines, throttleMs: windowMs });
  } catch (err) {
    console.error("Could not count a failure for an alert", err);
  }
}
