import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  generateResetToken,
  RESET_TOKEN_TTL_MS,
} from "@/lib/customer/reset-token";
import { sendEmail } from "@/lib/email/client";
import {
  HOUR,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import { verifyCaptcha } from "@/lib/security/turnstile";

export async function POST(request: NextRequest) {
  const { email, locale, captchaToken } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // also stops someone from flooding a person's mailbox with reset e-mails
  const wait = await checkRateLimits([
    { action: "forgot-ip", id: clientIp(request), limit: 5, windowMs: HOUR },
    { action: "forgot-email", id: normalizedEmail, limit: 3, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);
  if (!(await verifyCaptcha(captchaToken, clientIp(request)))) {
    return NextResponse.json({ error: "captcha_failed" }, { status: 400 });
  }
  const customer = await prisma.customer.findUnique({
    where: { email: normalizedEmail },
  });

  // Always respond ok, whether or not the account exists, so this endpoint
  // never reveals which emails are registered.
  if (customer) {
    const { token, tokenHash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        customerId: customer.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const effectiveLocale = locale === "en" ? "en" : "ro";
    const resetUrl = `${siteUrl}/${effectiveLocale}/account/reset-password?token=${token}`;

    try {
      const { subject, html } = passwordResetEmail(customer.locale, resetUrl);
      await sendEmail({ to: customer.email, subject, html });
    } catch (err) {
      console.error("Failed to send password reset email", err);
    }
  }

  return NextResponse.json({ ok: true });
}
