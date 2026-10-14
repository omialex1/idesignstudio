import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSession } from "@/lib/admin/auth";
import { getAdminPasswordHash } from "@/lib/admin/password";
import {
  MINUTE,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const wait = await checkRateLimits([
    {
      action: "admin-login-ip",
      id: clientIp(request),
      limit: 10,
      windowMs: 15 * MINUTE,
    },
  ]);
  if (wait) return tooManyRequests(wait);

  const { password } = await request.json();

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const hash = await getAdminPasswordHash();
  if (!hash) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
