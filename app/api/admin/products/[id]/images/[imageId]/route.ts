import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";

async function productSlug(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  return product?.slug ?? productId;
}

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: productId, imageId } = await params;
  const removed = await prisma.productImage.deleteMany({
    where: { id: imageId, productId },
  });
  if (removed.count > 0) {
    await logAdminAction(admin, "Poză ștearsă de la produs", await productSlug(productId));
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

// Sets the title of a photo. A photo titled exactly like a variant of the product is
// shown on the product page when the customer picks that variant.
export async function PUT(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: productId, imageId } = await params;
  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
  } | null;
  const title =
    typeof body?.title === "string" ? body.title.trim().slice(0, 80) : "";

  const updated = await prisma.productImage.updateMany({
    where: { id: imageId, productId },
    data: { altText: title || null },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await logAdminAction(admin, "Titlu poză modificat", await productSlug(productId));
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

// Makes the image the primary one (shown on cards and first in the gallery).
export async function PATCH(_request: Request, { params }: Params) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: productId, imageId } = await params;
  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  if (!images.some((i) => i.id === imageId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ordered = [
    imageId,
    ...images.map((i) => i.id).filter((i) => i !== imageId),
  ];
  await prisma.$transaction(
    ordered.map((id, index) =>
      prisma.productImage.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  await logAdminAction(admin, "Poză principală schimbată", await productSlug(productId));
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
