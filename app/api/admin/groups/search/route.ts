import { NextResponse } from "next/server";
import {
  discountConflicts,
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
  // ?conflicts=id1,id2&exclude=groupId: discount groups these products are already in
  const conflicts = params.get("conflicts");
  if (conflicts) {
    const ids = conflicts.split(",").filter(Boolean).slice(0, 300);
    return NextResponse.json(
      await discountConflicts(ids, params.get("exclude") || null),
    );
  }
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
