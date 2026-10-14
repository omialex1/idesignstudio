import { NextResponse } from "next/server";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import { getCustomerById } from "@/lib/customer/queries";
import { resendVerificationEmail } from "@/lib/customer/verify";
import {
  HOUR,
  checkRateLimits,
  tooManyRequests,
} from "@/lib/security/rate-limit";

export async function POST() {
  const customerId = await getCurrentCustomerId();
  const customer = customerId ? await getCustomerById(customerId) : null;
  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const wait = await checkRateLimits([
    { action: "resend-customer", id: customer.id, limit: 5, windowMs: HOUR },
  ]);
  if (wait) return tooManyRequests(wait);
  if (customer.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  try {
    const result = await resendVerificationEmail(customer);
    if (result === "too_soon") {
      return NextResponse.json({ error: "too_soon" }, { status: 429 });
    }
  } catch (err) {
    console.error("Failed to send verification email", err);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
