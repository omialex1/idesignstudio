import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { logAdminAction } from "@/lib/admin/log";
import {
  MAX_GROUP_NAME,
  asKind,
  asMax,
  groupsAdmin,
  listGroups,
  setGroupItems,
} from "@/lib/admin/groups";

export async function GET() {
  if (!(await groupsAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ groups: await listGroups() });
}

// Creates a group (with its products, in order).
export async function POST(request: Request) {
  const admin = await groupsAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_GROUP_NAME) {
    return NextResponse.json({ error: "name" }, { status: 400 });
  }
  const ids: unknown = body?.productIds ?? [];
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const maxItems = asMax(body?.maxItems);
  if (maxItems !== null && ids.length > maxItems) {
    return NextResponse.json({ error: "max" }, { status: 400 });
  }

  const group = await prisma.productGroup.create({
    data: { name, kind: asKind(body?.kind), maxItems },
  });
  const count = await setGroupItems(group.id, ids as string[]);
  await logAdminAction(admin, "Grup creat", `${name} (${count} produse)`);
  return NextResponse.json({ id: group.id });
}
