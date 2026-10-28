import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

// Called once a day by a Vercel cron job so the free Supabase project sees
// regular activity and doesn't auto-pause.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await prisma.category.count();
  } catch (err) {
    console.error("Keepalive database check failed", err);
    await sendAlert({
      key: "database-down",
      subject: "Baza de date nu răspunde",
      lines: [
        "Verificarea zilnică nu a putut citi din baza de date (Supabase).",
        "Verifică proiectul în Supabase (poate fi pus pe pauză sau să aibă o problemă).",
      ],
      throttleMs: 6 * 60 * 60 * 1000,
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
