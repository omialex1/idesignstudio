"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  PIECE_SLOTS,
  VARIANT_SLOTS,
  hasErrors,
  productPieceSort,
  validateProductForm,
  variantPieceSort,
  type FormErrors,
} from "@/lib/admin/form-validation";
import { finalPriceCents } from "@/lib/pricing";

async function assertAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("unauthorized");
}

// Slug problems that only the database can tell (already used by another product).
async function checkSlug(
  formData: FormData,
  ignoreProductId?: string,
): Promise<FormErrors> {
  const slugInput = String(formData.get("slug") || "").trim();
  const roName = String(formData.get("roName") || "").trim();
  const slug = slugInput ? slugify(slugInput) : slugify(roName);
  if (!slug) {
    return {
      slug: "Nu pot crea adresa din acest text. Scrie manual una, cu litere și cifre.",
    };
  }
  const existing = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing && existing.id !== ignoreProductId) {
    return {
      slug: "Există deja un produs cu această adresă (slug). Schimb-o sau lasă câmpul gol și modifică numele.",
    };
  }
  return {};
}

// The subcategory must still exist (it may have been deleted meanwhile).
async function checkCategory(formData: FormData): Promise<FormErrors> {
  const categoryId = String(formData.get("categoryId") || "");
  if (!categoryId) return {};
  const found = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  return found
    ? {}
    : { categoryId: "Subcategoria aleasă nu mai există. Alege alta." };
}

type PieceInput = {
  sortOrder: number;
  nameRo: string;
  nameEn: string | null;
  maxColors: number;
};

function readPiece(
  formData: FormData,
  keys: { ro: string; en: string; max: string },
  sortOrder: number,
): PieceInput | null {
  const nameRo = String(formData.get(keys.ro) || "").trim();
  if (!nameRo) return null;
  const nameEn = String(formData.get(keys.en) || "").trim();
  return {
    sortOrder,
    nameRo,
    nameEn: nameEn || null,
    maxColors: 1,
  };
}

// Pieces of a product that has no variants.
function readProductPieces(formData: FormData) {
  const pieces: PieceInput[] = [];
  for (let j = 0; j < PIECE_SLOTS; j++) {
    const piece = readPiece(
      formData,
      {
        ro: `componentNameRo${j}`,
        en: `componentNameEn${j}`,
        max: `componentMaxColors${j}`,
      },
      productPieceSort(j),
    );
    if (piece) pieces.push(piece);
  }
  return pieces;
}

function readVariants(formData: FormData) {
  const variants: {
    sortOrder: number;
    nameRo: string;
    nameEn: string | null;
    priceCents: number;
    discountPercent: number;
    pieces: PieceInput[];
  }[] = [];
  for (let i = 0; i < VARIANT_SLOTS; i++) {
    const nameRo = String(formData.get(`variantNameRo${i}`) || "").trim();
    const nameEn = String(formData.get(`variantNameEn${i}`) || "").trim();
    const price = parseFloat(String(formData.get(`variantPriceRon${i}`) || ""));
    if (!nameRo || !Number.isFinite(price) || price < 0) continue;
    const discount = parseInt(String(formData.get(`variantDiscount${i}`) || "0"), 10);

    const pieces: PieceInput[] = [];
    for (let j = 0; j < PIECE_SLOTS; j++) {
      const piece = readPiece(
        formData,
        {
          ro: `variantPieceNameRo${i}_${j}`,
          en: `variantPieceNameEn${i}_${j}`,
          max: `variantPieceMax${i}_${j}`,
        },
        variantPieceSort(i, j),
      );
      if (piece) pieces.push(piece);
    }

    variants.push({
      sortOrder: i,
      nameRo,
      nameEn: nameEn || null,
      priceCents: Math.round(price * 100),
      discountPercent: Number.isFinite(discount) ? discount : 0,
      pieces,
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
  const productPieces = readProductPieces(formData);

  // With variants, the product price is the cheapest price a customer pays
  // ("from X"), after any discount.
  const priceCents = variants.length
    ? Math.min(
        ...variants.map((v) => finalPriceCents(v.priceCents, v.discountPercent)),
      )
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
    productPieces,
    quantityOnHand: Number.isFinite(quantityOnHand) ? quantityOnHand : 0,
    lowStockThreshold: Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5,
    isActive,
  };
}

type ProductFormData = ReturnType<typeof readProductForm>;

// Writes the colour pieces: those of each variant, or the product's own pieces
// when it has no variants. Existing pieces keep their id, so customers' carts
// stay valid.
async function savePieces(
  productId: string,
  data: ProductFormData,
  dbVariants: { id: string; sortOrder: number }[],
) {
  const rows: (PieceInput & { variantId: string | null })[] = data.variants.length
    ? data.variants.flatMap((v) => {
        const variantId = dbVariants.find((d) => d.sortOrder === v.sortOrder)?.id;
        return variantId ? v.pieces.map((p) => ({ ...p, variantId })) : [];
      })
    : data.productPieces.map((p) => ({ ...p, variantId: null }));

  await prisma.$transaction([
    prisma.productComponent.deleteMany({
      where: { productId, sortOrder: { notIn: rows.map((r) => r.sortOrder) } },
    }),
    ...rows.map((r) =>
      prisma.productComponent.upsert({
        where: { productId_sortOrder: { productId, sortOrder: r.sortOrder } },
        create: {
          productId,
          variantId: r.variantId,
          sortOrder: r.sortOrder,
          nameRo: r.nameRo,
          nameEn: r.nameEn,
          maxColors: r.maxColors,
        },
        update: {
          variantId: r.variantId,
          nameRo: r.nameRo,
          nameEn: r.nameEn,
          maxColors: r.maxColors,
        },
      }),
    ),
  ]);
}

export async function createProduct(
  formData: FormData,
): Promise<{ id: string } | { errors: FormErrors }> {
  await assertAdmin();
  const errors = {
    ...validateProductForm(formData),
    ...(await checkSlug(formData)),
    ...(await checkCategory(formData)),
  };
  if (hasErrors(errors)) return { errors };

  const data = readProductForm(formData);

  const created = await prisma.product.create({
    data: {
      categoryId: data.categoryId,
      slug: data.slug,
      priceCents: data.priceCents,
      currency: "RON",
      isActive: data.isActive,
      hasColorOptions: data.hasColorOptions,
      variants: {
        create: data.variants.map((v) => ({
          sortOrder: v.sortOrder,
          nameRo: v.nameRo,
          nameEn: v.nameEn,
          priceCents: v.priceCents,
          discountPercent: v.discountPercent,
        })),
      },
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
    include: { variants: { select: { id: true, sortOrder: true } } },
  });

  await savePieces(created.id, data, created.variants);

  revalidatePath("/", "layout");
  return { id: created.id };
}

export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  await assertAdmin();
  const errors = {
    ...validateProductForm(formData),
    ...(await checkSlug(formData, productId)),
    ...(await checkCategory(formData)),
  };
  if (hasErrors(errors)) return { errors };

  const data = readProductForm(formData);

  const updated = await prisma.product.update({
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
          create: {
            sortOrder: v.sortOrder,
            nameRo: v.nameRo,
            nameEn: v.nameEn,
            priceCents: v.priceCents,
            discountPercent: v.discountPercent,
          },
          update: {
            nameRo: v.nameRo,
            nameEn: v.nameEn,
            priceCents: v.priceCents,
            discountPercent: v.discountPercent,
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
    include: { variants: { select: { id: true, sortOrder: true } } },
  });

  await savePieces(productId, data, updated.variants);

  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  await assertAdmin();
  const productId = String(formData.get("productId") || "");
  if (!productId) return;

  await prisma.product.delete({ where: { id: productId } });

  revalidatePath("/", "layout");
  redirect("/admin/products");
}
