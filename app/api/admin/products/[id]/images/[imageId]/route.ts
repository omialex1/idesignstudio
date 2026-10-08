import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin/auth";

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: productId, imageId } = await params;
  await prisma.productImage.deleteMany({ where: { id: imageId, productId } });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

// Makes the image the primary one (shown on cards and first in the gallery).
export async function PATCH(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
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

  const ordered = [imageId, ...images.map((i) => i.id).filter((i) => i !== imageId)];
  await prisma.$transaction(
    ordered.map((id, index) =>
      prisma.productImage.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
