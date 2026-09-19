import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSession } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64;
  if (!hashB64) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const hash = Buffer.from(hashB64, "base64").toString("utf-8");

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
