import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import {
  createAdminSession,
  createPending2fa,
  legacyLoginAllowed,
} from "@/lib/admin/auth";
import { getAdminPasswordHash } from "@/lib/admin/password";
import { finishAdminLogin } from "@/lib/admin/login";
import {
  MINUTE,
  checkRateLimits,
  clientIp,
  refundRateLimit,
  tooManyRequests,
} from "@/lib/security/rate-limit";

// Compared against when the account does not exist, so a wrong name and a
// wrong password take the same time to answer.
let dummyHash: string | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hashSync("not-a-real-password", 12);
  return dummyHash;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const identifier =
    typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;

  if (password.length === 0) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ip = clientIp(request);
  // 10 tries / 15 min from one address, and 5 / 15 min on one account whatever
  // the address (counted by the typed name, even if no such account exists).
  const rules = [
    { action: "admin-login-ip", id: ip, limit: 10, windowMs: 15 * MINUTE },
    ...(identifier
      ? [
          {
            action: "admin-login-account",
            id: identifier,
            limit: 5,
            windowMs: 15 * MINUTE,
          },
        ]
      : []),
  ];
  const wait = await checkRateLimits(rules);
  if (wait) return tooManyRequests(wait);

  async function giveBackAttempts() {
    await Promise.all(
      rules.map((r) => refundRateLimit(r.action, r.id)),
    );
  }

  // No name typed: only the old shared password, and only until the first
  // account has chosen its own password.
  if (!identifier) {
    if (!(await legacyLoginAllowed())) {
      await bcrypt.compare(password, getDummyHash());
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    const hash = await getAdminPasswordHash();
    if (!hash) {
      return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }
    if (!(await bcrypt.compare(password, hash))) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    await createAdminSession(null, false);
    await giveBackAttempts();
    return NextResponse.json({ ok: true });
  }

  const key = identifier.toLowerCase();
  const user = await prisma.adminUser.findFirst({
    where: { OR: [{ usernameKey: key }, { email: key }] },
  });

  const valid = await bcrypt.compare(
    password,
    user?.passwordHash ?? getDummyHash(),
  );
  if (!user || !user.passwordHash || !user.isActive || !valid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // Right password. With two-step login set up, the code is still needed.
  if (user.totpEnabledAt) {
    await createPending2fa(user, remember);
    // the password attempt is not held against the person; the code has its own limit
    await giveBackAttempts();
    return NextResponse.json({ ok: true, needs2fa: true });
  }

  await finishAdminLogin(user, remember, request, ip);
  await giveBackAttempts();
  return NextResponse.json({ ok: true });
}
