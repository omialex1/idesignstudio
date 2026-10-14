import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import {
  destroyCustomerSession,
  getCurrentCustomerId,
} from "@/lib/customer/auth";
import {
  HOUR,
  checkRateLimits,
  tooManyRequests,
} from "@/lib/security/rate-limit";

// Deletes the account for good. The password is asked again so a stolen
// session alone cannot do it. Orders are kept (accounting records) but are
// detached from the account (Order.customerId becomes empty), and reset tokens
// are removed with the account.
export async function POST(request: NextRequest) {
  const customerId = await getCurrentCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const wait = await checkRateLimits([
    { action: "delete-customer", id: customerId, limit: 10, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);

  const { password } = await request.json().catch(() => ({}));
  if (!password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const valid = await bcrypt.compare(String(password), customer.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "wrong_password" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.order.updateMany({
      where: { customerId: customer.id },
      data: { customerId: null },
    }),
    prisma.customer.delete({ where: { id: customer.id } }),
  ]);
  await destroyCustomerSession();
  return NextResponse.json({ ok: true });
}
