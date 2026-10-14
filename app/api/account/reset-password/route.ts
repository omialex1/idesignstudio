import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { hashResetToken } from "@/lib/customer/reset-token";
import { isValidPassword } from "@/lib/validation/password";
import { sendEmail } from "@/lib/email/client";
import { passwordChangedEmail } from "@/lib/email/templates/password-changed";
import {
  HOUR,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const wait = await checkRateLimits([
    { action: "reset-ip", id: clientIp(request), limit: 10, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);
  const { token, password } = await request.json();
  if (!token || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!isValidPassword(String(password))) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const tokenHash = hashResetToken(String(token));
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: resetToken.customerId },
      // every older login stops working
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const customer = await prisma.customer.findUnique({
    where: { id: resetToken.customerId },
  });
  if (customer) {
    try {
      const { subject, html } = passwordChangedEmail(customer.locale);
      await sendEmail({ to: customer.email, subject, html });
    } catch (err) {
      console.error("Failed to send password changed email", err);
    }
  }

  return NextResponse.json({ ok: true });
}
