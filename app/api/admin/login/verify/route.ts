import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { clearPending2fa, readPending2fa } from "@/lib/admin/auth";
import { finishAdminLogin } from "@/lib/admin/login";
import {
  decryptSecret,
  hashBackupCode,
  normalizeBackupCode,
  verifyTotp,
} from "@/lib/admin/totp";
import {
  MINUTE,
  checkRateLimits,
  clientIp,
  refundRateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";

// Second step of the login: the 6-digit code from the authenticator app, or one
// of the 20 backup codes. The password was already checked (the short-lived
// cookie proves it).
export async function POST(request: NextRequest) {
  const pending = await readPending2fa();
  if (!pending) {
    return NextResponse.json({ error: "expired" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const ip = clientIp(request);
  // 5 wrong codes / 15 min on one account, whatever the address
  const rules = [
    { action: "admin-2fa-ip", id: ip, limit: 10, windowMs: 15 * MINUTE },
    {
      action: "admin-2fa-account",
      id: pending.uid,
      limit: 5,
      windowMs: 15 * MINUTE,
    },
  ];
  const wait = await checkRateLimits(rules);
  if (wait) return tooManyRequests(wait);

  const user = await prisma.adminUser.findUnique({
    where: { id: pending.uid },
  });
  if (
    !user ||
    !user.isActive ||
    !user.passwordHash ||
    !user.totpSecret ||
    !user.totpEnabledAt ||
    user.sessionVersion !== pending.v
  ) {
    await clearPending2fa();
    return NextResponse.json({ error: "expired" }, { status: 401 });
  }

  let usedBackup = false;
  if (/^\d{6}$/.test(code.replace(/\s/g, ""))) {
    const step = verifyTotp(
      decryptSecret(user.totpSecret),
      code,
      user.totpLastStep,
    );
    if (step === null) {
      return NextResponse.json({ error: "invalid_code" }, { status: 401 });
    }
    // a code works once: the step is only taken if nobody used a newer one
    const taken = await prisma.adminUser.updateMany({
      where: {
        id: user.id,
        OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
      },
      data: { totpLastStep: step },
    });
    if (taken.count === 0) {
      return NextResponse.json({ error: "invalid_code" }, { status: 401 });
    }
  } else {
    const normalized = normalizeBackupCode(code);
    const used = normalized
      ? await prisma.adminBackupCode.updateMany({
          where: {
            adminUserId: user.id,
            codeHash: hashBackupCode(normalized),
            usedAt: null,
          },
          data: { usedAt: new Date() },
        })
      : { count: 0 };
    if (used.count === 0) {
      return NextResponse.json({ error: "invalid_code" }, { status: 401 });
    }
    usedBackup = true;
  }

  await clearPending2fa();
  await finishAdminLogin(
    user,
    pending.remember,
    request,
    ip,
    usedBackup ? "Conectare (cu cod de rezervă)" : "Conectare",
  );
  await Promise.all(rules.map((r) => refundRateLimit(r.action, r.id)));
  return NextResponse.json({ ok: true });
}
