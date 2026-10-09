import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM || "iDesignStudio.ro <onboarding@resend.dev>";

// The sending address (comenzi@) cannot receive mail, so replies go to the
// business mailbox unless a message sets its own reply-to (e.g. the customer).
const DEFAULT_REPLY_TO =
  process.env.EMAIL_REPLY_TO ||
  process.env.WITHDRAWAL_NOTIFY_EMAIL ||
  "contact@idesignstudio.ro";

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const resend = getResendClient();
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
    replyTo: replyTo ?? DEFAULT_REPLY_TO,
  });
  if (result.error) {
    throw new Error(`Failed to send email: ${result.error.message}`);
  }
  return result.data;
}
