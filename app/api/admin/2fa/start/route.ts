import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db/client";
import { getCurrentAdmin } from "@/lib/admin/auth";
import {
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  otpauthUri,
} from "@/lib/admin/totp";

// Starts setting up the authenticator app: gives the QR code and the same secret
// as text. Asking again before finishing returns the same secret, so a page
// refresh never leaves the app and the server with different ones.
export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (admin.twoFactorEnabled) {
    return NextResponse.json({ error: "already_enabled" }, { status: 409 });
  }

  const user = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let secret: string;
  if (user.totpSecret) {
    secret = decryptSecret(user.totpSecret);
  } else {
    secret = generateTotpSecret();
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { totpSecret: encryptSecret(secret) },
    });
  }

  const qr = await QRCode.toDataURL(otpauthUri(secret, user.username), {
    margin: 1,
    width: 220,
  });
  return NextResponse.json({ secret, qr });
}
