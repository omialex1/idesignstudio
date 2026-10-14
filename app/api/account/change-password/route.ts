import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import {
  createCustomerSession,
  getCurrentCustomerId,
} from "@/lib/customer/auth";
import { isValidPassword } from "@/lib/validation/password";
import { sendEmail } from "@/lib/email/client";
import { passwordChangedEmail } from "@/lib/email/templates/password-changed";
import {
  HOUR,
  checkRateLimits,
  tooManyRequests,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const customerId = await getCurrentCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const wait = await checkRateLimits([
    { action: "change-customer", id: customerId, limit: 10, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);

  const { currentPassword, newPassword } = await request
    .json()
    .catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!isValidPassword(String(newPassword))) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const valid = await bcrypt.compare(
    String(currentPassword),
    customer.passwordHash,
  );
  if (!valid) {
    return NextResponse.json({ error: "wrong_password" }, { status: 403 });
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      passwordHash: await bcrypt.hash(String(newPassword), 12),
      // every other device is signed out
      sessionVersion: { increment: 1 },
    },
  });
  // keep this device logged in with the new session version
  await createCustomerSession(customer.id);

  try {
    const { subject, html } = passwordChangedEmail(customer.locale);
    await sendEmail({ to: customer.email, subject, html });
  } catch (err) {
    console.error("Failed to send password changed email", err);
  }

  return NextResponse.json({ ok: true });
}
