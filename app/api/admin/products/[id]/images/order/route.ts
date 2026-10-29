import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";

// Saves the order of a product's photos after they were dragged in the admin.
// The first photo is the main one (shown on cards and first in the gallery).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.twoFactorEnabled) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: productId } = await params;
  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== "string")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const current = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const known = new Set(current.map((i) => i.id));
  const listed = (ids as string[]).filter(
    (id, index, all) => known.has(id) && all.indexOf(id) === index,
  );
  const listedSet = new Set(listed);
  // photos missing from the list keep their place, after the listed ones
  const finalOrder = [
    ...listed,
    ...current.map((i) => i.id).filter((id) => !listedSet.has(id)),
  ];

  const before = new Map(current.map((i, index) => [i.id, index]));
  const changes = finalOrder
    .map((id, index) => ({ id, index }))
    .filter((c) => before.get(c.id) !== c.index);
  if (changes.length === 0) return NextResponse.json({ ok: true });

  await prisma.$transaction(
    finalOrder.map((id, index) =>
      prisma.productImage.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  await logAdminAction(admin, "Poze reordonate", product?.slug ?? productId);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
