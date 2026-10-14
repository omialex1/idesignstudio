import { NextResponse } from "next/server";
import { createCustomerSession } from "@/lib/customer/auth";
import {
  clearPendingVerification,
  getPendingCustomerId,
} from "@/lib/customer/pending";
import { getCustomerById } from "@/lib/customer/queries";

// Polled by the "check your e-mail" screen. Once the address has been confirmed
// (the link may have been opened in the mail app or another window) this
// browser, which proved the password when it created the account, is logged in.
//   none     - this browser is not waiting for a confirmation
//   waiting  - not confirmed yet
//   verified - confirmed; the login cookie has just been set
export async function GET() {
  const customerId = await getPendingCustomerId();
  if (!customerId) return NextResponse.json({ status: "none" });

  const customer = await getCustomerById(customerId);
  if (!customer) {
    await clearPendingVerification();
    return NextResponse.json({ status: "none" });
  }
  if (!customer.emailVerifiedAt) {
    return NextResponse.json({ status: "waiting" });
  }

  await createCustomerSession(customer.id);
  await clearPendingVerification();
  return NextResponse.json({ status: "verified" });
}
