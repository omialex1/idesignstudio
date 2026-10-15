import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { createAdminSession } from "@/lib/admin/auth";
import { ADMIN_MIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { logAdminAction } from "@/lib/admin/log";
import { DEVICE_COOKIE, registerLoginDevice } from "@/lib/admin/users";
import { hashResetToken } from "@/lib/customer/reset-token";
import {
  HOUR,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";

const DEVICE_COOKIE_SECONDS = 60 * 60 * 24 * 400;

// Used by the invitation link (kind "invite") and the reset link (kind
// "reset"): the person chooses a password, which only they know, and is logged
// in right away.
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const wait = await checkRateLimits([
    { action: "admin-set-password-ip", id: ip, limit: 15, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);

  const { token, password, kind } = await request.json().catch(() => ({}));
  if (
    typeof token !== "string" ||
    typeof password !== "string" ||
    (kind !== "invite" && kind !== "reset")
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < ADMIN_MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const link = await prisma.adminUserToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { adminUser: true },
  });
  if (
    !link ||
    link.kind !== kind ||
    link.usedAt ||
    link.expiresAt < new Date() ||
    !link.adminUser.isActive
  ) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = link.adminUser;

  // The link is claimed first, so it can be used once even if it is opened twice
  // at the same moment.
  const claimed = await prisma.adminUserToken.updateMany({
    where: { id: link.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const updated = await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  const cookieStore = await cookies();
  const deviceId = await registerLoginDevice(
    user,
    cookieStore.get(DEVICE_COOKIE)?.value,
    request.headers.get("user-agent"),
    ip,
  );
  cookieStore.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_SECONDS,
  });

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createAdminSession(updated, false);
  await logAdminAction(
    user,
    kind === "invite" ? "Cont activat (parolă aleasă)" : "Parolă schimbată (resetare)",
  );
  return NextResponse.json({ ok: true });
}
