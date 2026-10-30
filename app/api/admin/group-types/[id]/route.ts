import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logAdminAction } from "@/lib/admin/log";
import { groupsAdmin } from "@/lib/admin/groups";
import { cleanTypeName } from "@/lib/admin/group-types";

type Ctx = { params: Promise<{ id: string }> };

// Renames a kind and sets what it does.
export async function PUT(request: Request, { params }: Ctx) {
  const admin = await groupsAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = cleanTypeName(body?.name);
  if (!name) return NextResponse.json({ error: "name" }, { status: 400 });

  const type = await prisma.productGroupType.findUnique({ where: { id } });
  if (!type) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const showOnSite = body?.showOnSite === true;
  const hasDiscount = body?.hasDiscount === true;
  await prisma.$transaction([
    prisma.productGroupType.update({
      where: { id },
      data: { name, showOnSite, hasDiscount },
    }),
    // a kind without a discount: its groups lose the discount they had
    ...(hasDiscount
      ? []
      : [
          prisma.productGroup.updateMany({
            where: { typeId: id },
            data: { discountPercent: null },
          }),
        ]),
    // keeps the old column in step for the groups of this kind
    prisma.productGroup.updateMany({
      where: { typeId: id },
      data: { kind: showOnSite ? "recommended" : "promo" },
    }),
  ]);
  await logAdminAction(admin, "Tip de grup modificat", name);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

// Deletes a kind that no group uses.
export async function DELETE(_request: Request, { params }: Ctx) {
  const admin = await groupsAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const type = await prisma.productGroupType.findUnique({
    where: { id },
    include: { _count: { select: { groups: true } } },
  });
  if (!type) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (type._count.groups > 0) {
    return NextResponse.json({ error: "in_use", groups: type._count.groups }, { status: 409 });
  }
  if ((await prisma.productGroupType.count()) <= 1) {
    return NextResponse.json({ error: "last" }, { status: 409 });
  }
  await prisma.productGroupType.delete({ where: { id } });
  await logAdminAction(admin, "Tip de grup șters", type.name);
  return NextResponse.json({ ok: true });
}
