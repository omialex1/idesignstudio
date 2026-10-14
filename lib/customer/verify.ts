import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/client";
import { verifyEmailEmail } from "@/lib/email/templates/welcome";
import { generateResetToken } from "@/lib/customer/reset-token";

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000;

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

// Creates a single-use token (stored hashed, like the password reset one) and
// returns the link to put in the e-mail.
export async function createVerificationLink(customer: {
  id: string;
  locale: string;
}): Promise<string> {
  const { token, tokenHash } = generateResetToken();
  await prisma.emailVerificationToken.create({
    data: {
      customerId: customer.id,
      tokenHash,
      expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });
  const locale = customer.locale === "en" ? "en" : "ro";
  return `${siteUrl()}/${locale}/account/verify-email?token=${token}`;
}

// Sends the verification e-mail again. Returns "too_soon" when one was sent
// less than a minute ago.
export async function resendVerificationEmail(customer: {
  id: string;
  email: string;
  name: string;
  locale: string;
}): Promise<"sent" | "too_soon"> {
  const last = await prisma.emailVerificationToken.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return "too_soon";
  }
  const url = await createVerificationLink(customer);
  const { subject, html } = verifyEmailEmail(
    customer.locale,
    customer.name,
    url,
  );
  await sendEmail({ to: customer.email, subject, html });
  return "sent";
}
