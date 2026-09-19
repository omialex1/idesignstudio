"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";

function readProductForm(formData: FormData) {
  const categoryId = String(formData.get("categoryId") || "");
  const slugInput = String(formData.get("slug") || "").trim();
  const roName = String(formData.get("roName") || "").trim();
  const roDescription = String(formData.get("roDescription") || "").trim();
  const enName = String(formData.get("enName") || "").trim();
  const enDescription = String(formData.get("enDescription") || "").trim();
  const priceRon = parseFloat(String(formData.get("priceRon") || "0"));
  const quantityOnHand = parseInt(String(formData.get("quantityOnHand") || "0"), 10);
  const lowStockThreshold = parseInt(String(formData.get("lowStockThreshold") || "5"), 10);
  const isActive = formData.get("isActive") === "on";

  return {
    categoryId,
    slug: slugInput ? slugify(slugInput) : slugify(roName),
    roName,
    roDescription: roDescription || null,
    enName,
    enDescription: enDescription || null,
    priceCents: Math.round(priceRon * 100),
    quantityOnHand: Number.isFinite(quantityOnHand) ? quantityOnHand : 0,
    lowStockThreshold: Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5,
    isActive,
  };
}

export async function createProduct(formData: FormData) {
  const data = readProductForm(formData);

  await prisma.product.create({
    data: {
      categoryId: data.categoryId,
      slug: data.slug,
      priceCents: data.priceCents,
      currency: "RON",
      isActive: data.isActive,
      translations: {
        create: [
          { locale: "ro", name: data.roName, description: data.roDescription },
          ...(data.enName
            ? [{ locale: "en", name: data.enName, description: data.enDescription }]
            : []),
        ],
      },
      inventory: {
        create: {
          quantityOnHand: data.quantityOnHand,
          lowStockThreshold: data.lowStockThreshold,
        },
      },
    },
  });

  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function updateProduct(productId: string, formData: FormData) {
  const data = readProductForm(formData);

  await prisma.product.update({
    where: { id: productId },
    data: {
      categoryId: data.categoryId,
      slug: data.slug,
      priceCents: data.priceCents,
      isActive: data.isActive,
      inventory: {
        upsert: {
          create: {
            quantityOnHand: data.quantityOnHand,
            lowStockThreshold: data.lowStockThreshold,
          },
          update: {
            quantityOnHand: data.quantityOnHand,
            lowStockThreshold: data.lowStockThreshold,
          },
        },
      },
      translations: {
        upsert: [
          {
            where: { productId_locale: { productId, locale: "ro" } },
            create: { locale: "ro", name: data.roName, description: data.roDescription },
            update: { name: data.roName, description: data.roDescription },
          },
          ...(data.enName
            ? [
                {
                  where: { productId_locale: { productId, locale: "en" } },
                  create: {
                    locale: "en",
                    name: data.enName,
                    description: data.enDescription,
                  },
                  update: { name: data.enName, description: data.enDescription },
                },
              ]
            : []),
        ],
      },
    },
  });

  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  if (!productId) return;

  await prisma.product.delete({ where: { id: productId } });

  revalidatePath("/", "layout");
  redirect("/admin/products");
}
