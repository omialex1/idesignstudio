import { NextResponse } from "next/server";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import { getCustomerById } from "@/lib/customer/queries";

// Name and e-mail of the logged-in customer, used to prefill the checkout.
export async function GET() {
  const customerId = await getCurrentCustomerId();
  const customer = customerId ? await getCustomerById(customerId) : null;
  if (!customer) {
    return NextResponse.json({ loggedIn: false }, { status: 200 });
  }
  return NextResponse.json({
    loggedIn: true,
    name: customer.name,
    email: customer.email,
  });
}
