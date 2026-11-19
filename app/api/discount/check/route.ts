import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import {
  checkCode,
  findDuplicate,
  ipHash,
  normalizeCode,
} from "@/lib/discount-codes";
import {
  HOUR,
  checkRateLimits,
  clientIp,
  tooManyRequests,
} from "@/lib/security/rate-limit";

// "Ai un cod?" at the end of the order: tells the page whether the code can be used, so the
// total can show the discount. Only the IP address and the account are known here; the name
// and the address are checked again when the order is placed (the real check).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const ip = clientIp(request);
  const wait = await checkRateLimits([
    { action: "discount-check", id: ip, limit: 30, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);

  const code = normalizeCode(body.code);
  const subtotalCents = Number(body.subtotalCents);
  const checked = await checkCode(
    prisma,
    code,
    Number.isFinite(subtotalCents) ? subtotalCents : undefined,
  );
  if (!checked.ok) {
    return NextResponse.json(
      { error: `code_${checked.error}`, minSubtotalCents: checked.minSubtotalCents },
      { status: 400 },
    );
  }

  if (checked.code.oneUsePerCustomer) {
    const customerId = await getCurrentCustomerId().catch(() => null);
    const duplicate = await findDuplicate(prisma, checked.code.id, {
      ipHash: ipHash(ip),
      customerId,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "code_reused", reasons: duplicate.reasons },
        { status: 409 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    code: checked.code.code,
    removesCodFee: checked.code.removesCodFee,
  });
}
