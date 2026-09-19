import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { createCustomerSession } from "@/lib/customer/auth";
import { sendEmail } from "@/lib/email/client";
import { welcomeEmail } from "@/lib/email/templates/welcome";

export async function POST(request: NextRequest) {
  const { email, password, name, locale } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await prisma.customer.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const customer = await prisma.customer.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: String(name).trim(),
      locale: locale === "en" ? "en" : "ro",
    },
  });

  await createCustomerSession(customer.id);

  try {
    const { subject, html } = welcomeEmail(customer.locale, customer.name);
    await sendEmail({ to: customer.email, subject, html });
  } catch (err) {
    console.error("Failed to send welcome email", err);
  }

  return NextResponse.json({ ok: true });
}
