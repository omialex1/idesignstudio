import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendAdminReset } from "@/lib/admin/users";
import {
  HOUR,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";

const MIN_INTERVAL_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const identifier =
    typeof body.identifier === "string" ? body.identifier.trim() : "";

  const wait = await checkRateLimits([
    {
      action: "admin-forgot-ip",
      id: clientIp(request),
      limit: 5,
      windowMs: HOUR,
    },
    ...(identifier
      ? [
          {
            action: "admin-forgot-account",
            id: identifier,
            limit: 3,
            windowMs: HOUR,
          },
        ]
      : []),
  ]);
  if (wait) return tooManyRequests(wait);

  // Always the same answer, so this page never reveals which accounts exist.
  if (!identifier) return NextResponse.json({ ok: true });

  const key = identifier.toLowerCase();
  const user = await prisma.adminUser.findFirst({
    where: {
      OR: [{ usernameKey: key }, { email: key }],
      isActive: true,
      passwordHash: { not: null },
    },
  });
  if (!user) return NextResponse.json({ ok: true });

  const recent = await prisma.adminUserToken.findFirst({
    where: {
      adminUserId: user.id,
      kind: "reset",
      createdAt: { gt: new Date(Date.now() - MIN_INTERVAL_MS) },
    },
  });
  if (recent) return NextResponse.json({ ok: true });

  try {
    await sendAdminReset(user);
  } catch (err) {
    console.error("Failed to send admin password reset email", err);
  }
  return NextResponse.json({ ok: true });
}
