import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logAdminAction } from "@/lib/admin/log";
import {
  MAX_GROUP_NAME,
  asMax,
  getGroup,
  groupsAdmin,
  resolveType,
  setGroupItems,
} from "@/lib/admin/groups";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await groupsAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ group });
}

// Saves the name, kind, limit and products (in order) of a group.
export async function PUT(request: Request, { params }: Ctx) {
  const admin = await groupsAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_GROUP_NAME) {
    return NextResponse.json({ error: "name" }, { status: 400 });
  }
  const ids: unknown = body?.productIds;
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const maxItems = asMax(body?.maxItems);
  if (maxItems !== null && ids.length > maxItems) {
    return NextResponse.json({ error: "max" }, { status: 400 });
  }

  const exists = await prisma.productGroup.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { type, discountPercent } = await resolveType(
    body?.typeId,
    body?.discountPercent,
  );
  await prisma.productGroup.update({
    where: { id },
    data: {
      name,
      typeId: type.id,
      kind: type.showOnSite ? "recommended" : "promo",
      discountPercent,
      maxItems,
    },
  });
  const count = await setGroupItems(id, ids as string[]);
  await logAdminAction(admin, "Grup modificat", `${name} (${count} produse)`);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const admin = await groupsAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const group = await prisma.productGroup.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!group) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.productGroup.delete({ where: { id } });
  await logAdminAction(admin, "Grup șters", group.name);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
