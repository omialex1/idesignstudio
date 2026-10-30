import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logAdminAction } from "@/lib/admin/log";
import { groupsAdmin } from "@/lib/admin/groups";
import { ensureGroupTypes } from "@/lib/admin/group-types";

type Ctx = { params: Promise<{ id: string }> };

// All groups, each marked with whether this product is in it.
export async function GET(_request: Request, { params }: Ctx) {
  if (!(await groupsAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await ensureGroupTypes();
  const groups = await prisma.productGroup.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: { select: { id: true, name: true, showOnSite: true, hasDiscount: true } },
      maxItems: true,
      _count: { select: { items: true } },
      items: { where: { productId: id }, select: { id: true } },
    },
  });
  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type ?? { id: "", name: "—", showOnSite: false, hasDiscount: false },
      maxItems: g.maxItems,
      count: g._count.items,
      member: g.items.length > 0,
    })),
  });
}

// Adds the product to a group (last place), or takes it out ({ remove: true }).
export async function POST(request: Request, { params }: Ctx) {
  const admin = await groupsAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const body = await request.json().catch(() => null);
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  const group = groupId
    ? await prisma.productGroup.findUnique({
        where: { id: groupId },
        include: { _count: { select: { items: true } } },
      })
    : null;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!group || !product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (body?.remove === true) {
    await prisma.productGroupItem.deleteMany({ where: { groupId, productId } });
    await logAdminAction(
      admin,
      "Produs scos din grup",
      `${product.slug} · ${group.name}`,
    );
  } else {
    const already = await prisma.productGroupItem.findUnique({
      where: { groupId_productId: { groupId, productId } },
      select: { id: true },
    });
    if (!already) {
      if (group.maxItems !== null && group._count.items >= group.maxItems) {
        return NextResponse.json({ error: "max" }, { status: 400 });
      }
      const last = await prisma.productGroupItem.aggregate({
        where: { groupId },
        _max: { sortOrder: true },
      });
      await prisma.productGroupItem.create({
        data: { groupId, productId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
      await logAdminAction(
        admin,
        "Produs adăugat în grup",
        `${product.slug} · ${group.name}`,
      );
    }
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
