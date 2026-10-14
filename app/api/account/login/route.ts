import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { createCustomerSession } from "@/lib/customer/auth";
import {
  MINUTE,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // slows down guessing: per IP address and per account
  const wait = await checkRateLimits([
    {
      action: "login-ip",
      id: clientIp(request),
      limit: 10,
      windowMs: 15 * MINUTE,
    },
    {
      action: "login-email",
      id: normalizedEmail,
      limit: 5,
      windowMs: 15 * MINUTE,
    },
  ]);
  if (wait) return tooManyRequests(wait);
  const customer = await prisma.customer.findUnique({
    where: { email: normalizedEmail },
  });
  if (!customer) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(String(password), customer.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createCustomerSession(customer.id);
  return NextResponse.json({ ok: true });
}
