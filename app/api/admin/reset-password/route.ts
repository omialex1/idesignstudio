import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { ADMIN_MIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { hashResetToken } from "@/lib/customer/reset-token";
import {
  HOUR,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const wait = await checkRateLimits([
    {
      action: "admin-reset-ip",
      id: clientIp(request),
      limit: 10,
      windowMs: HOUR,
    },
  ]);
  if (wait) return tooManyRequests(wait);

  const { token, password } = await request.json().catch(() => ({}));
  if (typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < ADMIN_MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const resetToken = await prisma.adminPasswordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.adminCredential.upsert({
      where: { id: "admin" },
      update: { passwordHash },
      create: { id: "admin", passwordHash },
    }),
    prisma.adminPasswordResetToken.updateMany({
      where: { usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
