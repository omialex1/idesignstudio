import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

// Limits on how often something can be tried (login, sign-up, checkout...).
// Every attempt is counted per action and per IP address / e-mail / phone. The
// counter key is a hash, so no IP address, e-mail or phone is stored in clear.
// A counter lives for its window and old rows are removed after a day.
//
// If the counter store is unreachable the attempt is allowed (a database hiccup
// must not lock customers out), and the problem is logged.

export type RateRule = {
  action: string;
  // the thing counted: IP address, e-mail, phone number or customer id
  id: string;
  limit: number;
  windowMs: number;
};

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function pepper() {
  return (
    process.env.CUSTOMER_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "rate-limit"
  );
}

function keyOf(action: string, id: string) {
  return createHash("sha256")
    .update(`${pepper()}|${action}|${id.toLowerCase()}`)
    .digest("hex");
}

export function clientIp(request: Request): string {
  const headers = request.headers;
  const ip =
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0] ??
    "unknown";
  return ip.trim() || "unknown";
}

// Counts one attempt; returns the seconds to wait when over the limit.
async function hit(rule: RateRule): Promise<number> {
  const key = keyOf(rule.action, rule.id);
  const now = new Date();
  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, windowStart: now },
    update: { count: { increment: 1 } },
  });
  const elapsed = now.getTime() - row.windowStart.getTime();
  if (elapsed >= rule.windowMs) {
    // the window is over: start a new one with this attempt
    await prisma.rateLimit.update({
      where: { key },
      data: { count: 1, windowStart: now },
    });
    return 0;
  }
  return row.count > rule.limit
    ? Math.ceil((rule.windowMs - elapsed) / 1000)
    : 0;
}

// Counts the attempt against every rule. Returns 0 when allowed, otherwise the
// longest wait (seconds) among the rules that are over their limit.
export async function checkRateLimits(rules: RateRule[]): Promise<number> {
  try {
    const waits = await Promise.all(rules.map(hit));
    if (Math.random() < 0.02) {
      prisma.rateLimit
        .deleteMany({
          where: { windowStart: { lt: new Date(Date.now() - DAY) } },
        })
        .catch(() => {});
    }
    return Math.max(0, ...waits);
  } catch (err) {
    console.error("Rate limit store unavailable, allowing the attempt", err);
    return 0;
  }
}

// Gives back an attempt that was not the customer's fault (for example the
// payment could not be started), so honest retries are not used up.
export async function refundRateLimit(action: string, id: string) {
  try {
    await prisma.rateLimit.updateMany({
      where: { key: keyOf(action, id), count: { gt: 0 } },
      data: { count: { decrement: 1 } },
    });
  } catch (err) {
    console.error("Could not refund a rate limit attempt", err);
  }
}

export function tooManyRequests(retryAfterSec: number) {
  return NextResponse.json(
    { error: "too_many_requests", retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
