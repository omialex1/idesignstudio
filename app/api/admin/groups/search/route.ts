import { NextResponse } from "next/server";
import {
  groupsAdmin,
  productsOfCategory,
  searchForGroup,
} from "@/lib/admin/groups";

// ?q=text: matching products and categories. ?main=ID or ?sub=ID: the active
// products of that category / subcategory (for "Adaugă toate").
export async function GET(request: Request) {
  if (!(await groupsAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const main = params.get("main");
  const sub = params.get("sub");
  if (main) {
    return NextResponse.json({ products: await productsOfCategory("main", main) });
  }
  if (sub) {
    return NextResponse.json({ products: await productsOfCategory("sub", sub) });
  }
  const q = (params.get("q") ?? "").slice(0, 80);
  return NextResponse.json(await searchForGroup(q));
}
