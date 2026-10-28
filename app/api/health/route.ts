import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

// For an uptime monitor: 200 when the site and its database answer, 503 when
// the database does not. Says nothing else, so it is safe to leave public.
export async function GET() {
  try {
    await prisma.category.count();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Health check: database not reachable", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
