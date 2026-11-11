import { NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/db/products";

// The cards of the products a visitor marked with the heart. The ids live in the
// visitor's browser, so this only returns what is public anyway (active products).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;
  const locale = body?.locale === "en" ? "en" : "ro";
  if (
    !Array.isArray(ids) ||
    ids.length > 100 ||
    ids.some((id) => typeof id !== "string" || id.length > 40)
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const products = await getProductsByIds(ids as string[], locale);
  return NextResponse.json({ products });
}
