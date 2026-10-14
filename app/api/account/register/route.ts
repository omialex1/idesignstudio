import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { createCustomerSession } from "@/lib/customer/auth";
import { isValidPassword } from "@/lib/validation/password";
import { verifyCaptcha } from "@/lib/security/turnstile";
import {
  HOUR,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/email/client";
import { welcomeEmail } from "@/lib/email/templates/welcome";
import { createVerificationLink } from "@/lib/customer/verify";

export async function POST(request: NextRequest) {
  const { email, password, name, locale, captchaToken } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const wait = await checkRateLimits([
    { action: "register-ip", id: clientIp(request), limit: 5, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);
  if (!(await verifyCaptcha(captchaToken, clientIp(request)))) {
    return NextResponse.json({ error: "captcha_failed" }, { status: 400 });
  }
  if (!isValidPassword(String(password))) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await prisma.customer.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const customer = await prisma.customer.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: String(name).trim(),
      locale: locale === "en" ? "en" : "ro",
    },
  });

  await createCustomerSession(customer.id);

  try {
    const verifyUrl = await createVerificationLink(customer);
    const { subject, html } = welcomeEmail(
      customer.locale,
      customer.name,
      verifyUrl,
    );
    await sendEmail({ to: customer.email, subject, html });
  } catch (err) {
    console.error("Failed to send welcome email", err);
  }

  return NextResponse.json({ ok: true });
}
