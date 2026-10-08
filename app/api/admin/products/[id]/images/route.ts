import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  MAX_IMAGES_PER_PRODUCT,
  MAX_IMAGE_BYTES,
  detectImageType,
  productImageUrl,
} from "@/lib/images/product-images";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const existing = await prisma.productImage.findMany({
    where: { productId },
    select: { sortOrder: true },
  });
  if (existing.length >= MAX_IMAGES_PER_PRODUCT) {
    return NextResponse.json({ error: "limit_reached" }, { status: 409 });
  }

  const imageId = randomUUID();
  const nextOrder = existing.length
    ? Math.max(...existing.map((i) => i.sortOrder)) + 1
    : 0;

  await prisma.productImage.create({
    data: {
      id: imageId,
      productId,
      url: productImageUrl(imageId),
      sortOrder: nextOrder,
      data: { create: { contentType, data: bytes } },
    },
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ id: imageId, url: productImageUrl(imageId) });
}
