import { NextRequest, NextResponse } from "next/server";
import { suggestProducts } from "@/lib/db/search";

// Up to 3 product names for the search box while typing. The answer is the same
// for everyone, so it can be kept for a minute by the CDN.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ro";

  const suggestions = await suggestProducts(q, locale).catch(() => []);
  return NextResponse.json(
    { suggestions },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
