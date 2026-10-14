import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashResetToken } from "@/lib/customer/reset-token";
import { createCustomerSession } from "@/lib/customer/auth";
import {
  clearPendingVerification,
  getPendingCustomerId,
} from "@/lib/customer/pending";
import {
  HOUR,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";

// Confirms the e-mail address from the link in the message. Once the address is
// confirmed, orders placed as a guest with the same address are connected to
// the account (only the owner of the mailbox can reach this point).
export async function POST(request: NextRequest) {
  const wait = await checkRateLimits([
    { action: "verify-ip", id: clientIp(request), limit: 20, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);
  const { token } = await request.json().catch(() => ({}));
  if (!token) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashResetToken(String(token)) },
    include: { customer: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const customer = record.customer;
  const [, , linked] = await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.customer.update({
      where: { id: customer.id },
      data: { emailVerifiedAt: customer.emailVerifiedAt ?? new Date() },
    }),
    prisma.order.updateMany({
      where: { customerId: null, customerEmail: customer.email.toLowerCase() },
      data: { customerId: customer.id },
    }),
  ]);

  // Same browser that created the account: log it in right away. Otherwise
  // (link opened in the mail app) the person logs in with the password; the
  // browser that is waiting is logged in by the status check.
  let loggedIn = false;
  if ((await getPendingCustomerId()) === customer.id) {
    await createCustomerSession(customer.id);
    await clearPendingVerification();
    loggedIn = true;
  }

  return NextResponse.json({
    ok: true,
    linkedOrders: linked.count,
    loggedIn,
    email: customer.email,
  });
}
