import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { getCurrentCustomerId } from "@/lib/customer/auth";

export async function POST(request: NextRequest) {
  const customerId = await getCurrentCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request
    .json()
    .catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const valid = await bcrypt.compare(
    String(currentPassword),
    customer.passwordHash,
  );
  if (!valid) {
    return NextResponse.json({ error: "wrong_password" }, { status: 403 });
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash: await bcrypt.hash(String(newPassword), 12) },
  });
  return NextResponse.json({ ok: true });
}
