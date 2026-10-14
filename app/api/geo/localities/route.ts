import { NextRequest, NextResponse } from "next/server";
import { getLocalities } from "@/lib/geo/localities";

// The localities of one county, for the checkout and account address fields.
export async function GET(request: NextRequest) {
  const county = request.nextUrl.searchParams.get("county") ?? "";
  const localities = getLocalities(county);
  return NextResponse.json(
    { localities },
    {
      headers: {
        // the list only changes when the site is rebuilt with newer data
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
