import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/client";
import {
  withdrawalAcknowledgementEmail,
  withdrawalBusinessEmail,
} from "@/lib/email/templates/withdrawal";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Hidden field real visitors never fill in; bots usually do.
  if (clean(body.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const withdrawal = {
    name: clean(body.name, 120),
    email: clean(body.email, 200).toLowerCase(),
    orderNumber: clean(body.orderNumber, 60),
    products: clean(body.products, 1000),
    message: clean(body.message, 2000),
  };
  const locale = body.locale === "en" ? "en" : "ro";

  if (
    !withdrawal.name ||
    !withdrawal.orderNumber ||
    !withdrawal.products ||
    !EMAIL_PATTERN.test(withdrawal.email)
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const notifyEmail = process.env.WITHDRAWAL_NOTIFY_EMAIL;
  if (!notifyEmail) {
    console.error("WITHDRAWAL_NOTIFY_EMAIL is not set");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    const toBusiness = withdrawalBusinessEmail(withdrawal);
    await sendEmail({
      to: notifyEmail,
      replyTo: withdrawal.email,
      ...toBusiness,
    });

    const toCustomer = withdrawalAcknowledgementEmail(locale, withdrawal);
    await sendEmail({ to: withdrawal.email, ...toCustomer });
  } catch (err) {
    console.error("Failed to send withdrawal emails", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
