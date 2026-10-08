import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAdminResetEmail } from "@/lib/admin/password";
import { sendEmail } from "@/lib/email/client";
import { adminPasswordResetEmail } from "@/lib/email/templates/admin-password-reset";
import {
  generateResetToken,
  RESET_TOKEN_TTL_MS,
} from "@/lib/customer/reset-token";

const MIN_INTERVAL_MS = 5 * 60 * 1000;

export async function POST() {
  const recipient = getAdminResetEmail();

  // Always answer the same way, so this page never reveals anything.
  if (!recipient) {
    console.error("No admin reset email is configured");
    return NextResponse.json({ ok: true });
  }

  const recent = await prisma.adminPasswordResetToken.findFirst({
    where: { createdAt: { gt: new Date(Date.now() - MIN_INTERVAL_MS) } },
  });
  if (recent) return NextResponse.json({ ok: true });

  const { token, tokenHash } = generateResetToken();
  await prisma.adminPasswordResetToken.create({
    data: { tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  try {
    const { subject, html } = adminPasswordResetEmail(
      `${siteUrl}/admin/reset-password?token=${token}`,
    );
    await sendEmail({ to: recipient, subject, html });
  } catch (err) {
    console.error("Failed to send admin password reset email", err);
  }

  return NextResponse.json({ ok: true });
}
