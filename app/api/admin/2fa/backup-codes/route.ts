import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import {
  decryptSecret,
  generateBackupCodes,
  hashBackupCode,
  verifyTotp,
} from "@/lib/admin/totp";
import {
  MINUTE,
  checkRateLimits,
  refundRateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";

// New set of 20 backup codes (the old ones stop working). Needs a fresh code
// from the app, so a stolen open session alone is not enough.
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.id || !admin.twoFactorEnabled) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const wait = await checkRateLimits([
    {
      action: "admin-2fa-account",
      id: admin.id,
      limit: 5,
      windowMs: 15 * MINUTE,
    },
  ]);
  if (wait) return tooManyRequests(wait);

  const { code } = await request.json().catch(() => ({}));
  const user = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  if (!user?.totpSecret || typeof code !== "string") {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }
  const step = verifyTotp(
    decryptSecret(user.totpSecret),
    code,
    user.totpLastStep,
  );
  if (step === null) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const codes = generateBackupCodes();
  await prisma.$transaction([
    prisma.adminBackupCode.deleteMany({ where: { adminUserId: user.id } }),
    prisma.adminBackupCode.createMany({
      data: codes.map((c) => ({
        adminUserId: user.id,
        codeHash: hashBackupCode(c),
      })),
    }),
    prisma.adminUser.update({
      where: { id: user.id },
      data: { totpLastStep: step },
    }),
  ]);
  await logAdminAction(user, "Coduri de rezervă regenerate");
  // a right code is not held against the person
  await refundRateLimit("admin-2fa-account", user.id);
  return NextResponse.json({ ok: true, codes });
}
