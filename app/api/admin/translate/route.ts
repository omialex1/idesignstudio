import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { TranslationError, translateTexts } from "@/lib/translate/translate";

const MAX_TEXTS = 60;
const MAX_TOTAL_CHARS = 40_000;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const from = body?.from === "en" ? "en" : body?.from === "ro" ? "ro" : null;
  const texts: unknown = body?.texts;
  if (
    !from ||
    !Array.isArray(texts) ||
    texts.length === 0 ||
    texts.length > MAX_TEXTS ||
    !texts.every((t) => typeof t === "string")
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const total = (texts as string[]).reduce((sum, t) => sum + t.length, 0);
  if (total > MAX_TOTAL_CHARS) {
    return NextResponse.json({ error: "too_long" }, { status: 413 });
  }

  try {
    const translations = await translateTexts(texts as string[], from);
    return NextResponse.json({ translations });
  } catch (err) {
    if (err instanceof TranslationError) {
      const status = err.code === "not_configured" ? 503 : 502;
      return NextResponse.json({ error: err.code }, { status });
    }
    console.error("Translation failed", err);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
