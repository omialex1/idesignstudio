"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";

const VARIANT_SLOTS = 4;
const COMPONENT_SLOTS = 5;

function readComponents(formData: FormData) {
  const components: {
    sortOrder: number;
    nameRo: string;
    nameEn: string | null;
    maxColors: number;
  }[] = [];
  for (let i = 0; i < COMPONENT_SLOTS; i++) {
    const nameRo = String(formData.get(`componentNameRo${i}`) || "").trim();
    if (!nameRo) continue;
    const nameEn = String(formData.get(`componentNameEn${i}`) || "").trim();
    const max = parseInt(String(formData.get(`componentMaxColors${i}`) || "1"), 10);
    components.push({
      sortOrder: i,
      nameRo,
      nameEn: nameEn || null,
      maxColors: Math.min(3, Math.max(1, Number.isFinite(max) ? max : 1)),
    });
  }
  return components;
}

function readVariants(formData: FormData) {
  const variants: {
    sortOrder: number;
    nameRo: string;
    nameEn: string | null;
    priceCents: number;
  }[] = [];
  for (let i = 0; i < VARIANT_SLOTS; i++) {
    const nameRo = String(formData.get(`variantNameRo${i}`) || "").trim();
    const nameEn = String(formData.get(`variantNameEn${i}`) || "").trim();
    const price = parseFloat(String(formData.get(`variantPriceRon${i}`) || ""));
    if (!nameRo || !Number.isFinite(price) || price < 0) continue;
    variants.push({
      sortOrder: i,
      nameRo,
      nameEn: nameEn || null,
      priceCents: Math.round(price * 100),
    });
  }
  return variants;
}

function readProductForm(formData: FormData) {
  const categoryId = String(formData.get("categoryId") || "");
  const slugInput = String(formData.get("slug") || "").trim();
  const roName = String(formData.get("roName") || "").trim();
  const roDescription = String(formData.get("roDescription") || "").trim();
  const roLongDescription = String(formData.get("roLongDescription") || "").trim();
  const enLongDescription = String(formData.get("enLongDescription") || "").trim();
  const enName = String(formData.get("enName") || "").trim();
  const enDescription = String(formData.get("enDescription") || "").trim();
  const priceRon = parseFloat(String(formData.get("priceRon") || ""));
  const quantityOnHand = parseInt(String(formData.get("quantityOnHand") || "0"), 10);
  const lowStockThreshold = parseInt(String(formData.get("lowStockThreshold") || "5"), 10);
  const isActive = formData.get("isActive") === "on";
  const hasColorOptions = formData.get("hasColorOptions") === "on";
  const variants = readVariants(formData);
  const components = readComponents(formData);

  // With variants, the product price is the cheapest one ("from X").
  const priceCents = variants.length
    ? Math.min(...variants.map((v) => v.priceCents))
    : Math.round(priceRon * 100);
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    throw new Error("Prețul este obligatoriu când produsul nu are variante.");
  }

  return {
    categoryId,
    slug: slugInput ? slugify(slugInput) : slugify(roName),
    roName,
    roDescription: roDescription || null,
    roLongDescription: roLongDescription || null,
    enName,
    enDescription: enDescription || null,
    enLongDescription: enLongDescription || null,
    priceCents,
    hasColorOptions,
    variants,
    components,
    quantityOnHand: Number.isFinite(quantityOnHand) ? quantityOnHand : 0,
    lowStockThreshold: Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5,
    isActive,
  };
}

export async function createProduct(formData: FormData) {
  const data = readProductForm(formData);

  const created = await prisma.product.create({
    data: {
      categoryId: data.categoryId,
      slug: data.slug,
      priceCents: data.priceCents,
      currency: "RON",
      isActive: data.isActive,
      hasColorOptions: data.hasColorOptions,
      variants: { create: data.variants },
      components: { create: data.components },
      translations: {
        create: [
          {
            locale: "ro",
            name: data.roName,
            description: data.roDescription,
            longDescription: data.roLongDescription,
          },
          ...(data.enName
            ? [
                {
                  locale: "en",
                  name: data.enName,
                  description: data.enDescription,
                  longDescription: data.enLongDescription,
                },
              ]
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
  redirect(`/admin/products/${created.id}/edit?created=1`);
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
      hasColorOptions: data.hasColorOptions,
      variants: {
        deleteMany: { sortOrder: { notIn: data.variants.map((v) => v.sortOrder) } },
        upsert: data.variants.map((v) => ({
          where: { productId_sortOrder: { productId, sortOrder: v.sortOrder } },
          create: v,
          update: {
            nameRo: v.nameRo,
            nameEn: v.nameEn,
            priceCents: v.priceCents,
          },
        })),
      },
      components: {
        deleteMany: {
          sortOrder: { notIn: data.components.map((c) => c.sortOrder) },
        },
        upsert: data.components.map((c) => ({
          where: { productId_sortOrder: { productId, sortOrder: c.sortOrder } },
          create: c,
          update: {
            nameRo: c.nameRo,
            nameEn: c.nameEn,
            maxColors: c.maxColors,
          },
        })),
      },
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
            create: {
              locale: "ro",
              name: data.roName,
              description: data.roDescription,
              longDescription: data.roLongDescription,
            },
            update: {
              name: data.roName,
              description: data.roDescription,
              longDescription: data.roLongDescription,
            },
          },
          ...(data.enName
            ? [
                {
                  where: { productId_locale: { productId, locale: "en" } },
                  create: {
                    locale: "en",
                    name: data.enName,
                    description: data.enDescription,
                    longDescription: data.enLongDescription,
                  },
                  update: {
                    name: data.enName,
                    description: data.enDescription,
                    longDescription: data.enLongDescription,
                  },
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
