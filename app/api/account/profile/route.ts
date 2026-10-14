import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import { validateAddress } from "@/lib/address/validate";

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

// Saves name, phone and the delivery address of the logged-in customer. They
// prefill the checkout. The same checks as at checkout apply (phone digits,
// county list, locality list, 6-digit postal code); fields may be left empty.
export async function PUT(request: NextRequest) {
  const customerId = await getCurrentCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const name = clean(body.name, 120);
  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  const addressLine = clean(body.addressLine, 200);

  const checked = validateAddress({
    phone: clean(body.phone, 30),
    county: clean(body.county, 100),
    city: clean(body.city, 150),
    postalCode: clean(body.postalCode, 6),
  });
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }
  // a county without its locality (or the other way round) is half an address
  if ((checked.county && !checked.city) || (!checked.county && checked.city)) {
    return NextResponse.json({ error: "incomplete_address" }, { status: 400 });
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name,
      phone: checked.phone || null,
      county: checked.county || null,
      city: checked.city || null,
      addressLine: addressLine || null,
      postalCode: checked.postalCode || null,
    },
  });

  return NextResponse.json({
    ok: true,
    city: checked.city,
    county: checked.county,
    phone: checked.phone,
    unverified: checked.unverified,
  });
}
