import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logAdminAction } from "@/lib/admin/log";
import { groupsAdmin } from "@/lib/admin/groups";
import { ensureGroupTypes } from "@/lib/admin/group-types";
import { activeDiscounts } from "@/lib/discounts";

type Ctx = { params: Promise<{ id: string }> };

// All groups, each marked with whether this product is in it, plus what the
// discounts of the product are doing now.
export async function GET(_request: Request, { params }: Ctx) {
  if (!(await groupsAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await ensureGroupTypes();
  const [groups, product, active] = await Promise.all([
    prisma.productGroup.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: {
          select: {
            id: true,
            name: true,
            showOnSite: true,
            hasDiscount: true,
            showLabel: true,
          },
        },
        discountPercent: true,
        discountLive: true,
        startsAt: true,
        endsAt: true,
        maxItems: true,
        _count: { select: { items: true } },
        items: { where: { productId: id }, select: { id: true, live: true } },
      },
    }),
    prisma.product.findUnique({
      where: { id },
      select: { discountGroupId: true, tieredPricing: true },
    }),
    activeDiscounts([id]),
  ]);
  const now = active.get(id);
  return NextResponse.json({
    chosenGroupId: product?.discountGroupId ?? null,
    tiered: product?.tieredPricing ?? false,
    // the discount customers get right now (null: none)
    now: now ? { percent: now.percent, groupId: now.groupId, groupName: now.groupName } : null,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type ?? {
        id: "",
        name: "—",
        showOnSite: false,
        hasDiscount: false,
        showLabel: false,
      },
      discountPercent: g.discountPercent,
      discountLive: g.discountLive,
      startsAt: g.startsAt ? g.startsAt.toISOString() : null,
      endsAt: g.endsAt ? g.endsAt.toISOString() : null,
      maxItems: g.maxItems,
      count: g._count.items,
      member: g.items.length > 0,
      // this product's own switch (null: follows the group)
      live: g.items[0]?.live ?? null,
    })),
  });
}

// { groupId }: adds the product to a group (last place); { groupId, remove: true }
// takes it out; { groupId, live: true | false | null }: its own discount switch in
// that group; { choose: groupId | null }: the discount that applies when it is in
// several groups with a discount (null: the biggest).
export async function POST(request: Request, { params }: Ctx) {
  const admin = await groupsAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const body = await request.json().catch(() => null);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body && "choose" in body) {
    const choose = typeof body.choose === "string" ? body.choose : null;
    await prisma.product.update({
      where: { id: productId },
      data: { discountGroupId: choose },
    });
    await logAdminAction(admin, "Discount ales pentru produs", product.slug);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  }

  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  const group = groupId
    ? await prisma.productGroup.findUnique({
        where: { id: groupId },
        include: { _count: { select: { items: true } }, type: true },
      })
    : null;
  if (!group) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body && "live" in body) {
    const live = typeof body.live === "boolean" ? body.live : null;
    await prisma.productGroupItem.updateMany({
      where: { groupId, productId },
      data: { live: group.type?.hasDiscount ? live : null },
    });
    await logAdminAction(
      admin,
      live === null ? "Discount produs: urmează grupul" : live ? "Discount produs pornit" : "Discount produs oprit",
      `${product.slug} · ${group.name}`,
    );
  } else if (body?.remove === true) {
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
