import { NextRequest, NextResponse } from "next/server";
import {
  cleanPath,
  isBot,
  recordVisit,
  sourceOf,
} from "@/lib/traffic";

// The visitor counter's entry point: the page sends one small message per page
// opened (see components/layout/TrafficBeacon.tsx). Nothing is sent back.
export async function POST(request: NextRequest) {
  const noContent = new NextResponse(null, { status: 204 });

  // only from our own pages
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? "";
  if (origin) {
    try {
      if (new URL(origin).host !== host) return noContent;
    } catch {
      return noContent;
    }
  }
  // the admin's own visits are not counted
  if (request.cookies.get("admin_session")) return noContent;

  const userAgent = request.headers.get("user-agent");
  if (isBot(userAgent)) return noContent;

  const body = await request.json().catch(() => null);
  const path = cleanPath(body?.path);
  if (!path) return noContent;

  const country = (request.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "";

  await recordVisit({
    path,
    first: body?.first === true,
    source: sourceOf(body?.ref, host.split(":")[0]),
    country: /^[A-Z]{2}$/.test(country) ? country : "??",
    userAgent: userAgent as string,
    address,
  });
  return noContent;
}
