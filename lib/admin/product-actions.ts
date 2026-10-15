"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import {
  PIECE_SLOTS,
  TIER_SLOTS,
  VARIANT_SLOTS,
  hasErrors,
  productPieceSort,
  validateProductForm,
  variantPieceSort,
  type FormErrors,
} from "@/lib/admin/form-validation";
import { variantPricing } from "@/lib/pricing";
import { rangeLabel, tierRanges } from "@/lib/tiers";

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
    minQuantity: number | null;
    pieces: PieceInput[];
  }[] = [];
  for (let i = 0; i < VARIANT_SLOTS; i++) {
    const nameRo = String(formData.get(`variantNameRo${i}`) || "").trim();
    const nameEn = String(formData.get(`variantNameEn${i}`) || "").trim();
    const price = parseFloat(String(formData.get(`variantPriceRon${i}`) || ""));
    if (!nameRo || !Number.isFinite(price) || price < 0) continue;
    const discount = parseInt(
      String(formData.get(`variantDiscount${i}`) || "0"),
      10,
    );

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
      minQuantity: null,
      pieces,
    });
  }
  return variants;
}

// Quantity tiers are stored as variant rows with a minimum quantity; their
// names ("50–99 buc") are made from the ranges.
function readTiers(formData: FormData) {
  const rows: { minQuantity: number; priceCents: number }[] = [];
  for (let i = 0; i < TIER_SLOTS; i++) {
    const min = parseInt(String(formData.get(`tierMin${i}`) || ""), 10);
    const price = parseFloat(String(formData.get(`tierPriceRon${i}`) || ""));
    if (
      !Number.isInteger(min) ||
      min < 1 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      continue;
    }
    rows.push({ minQuantity: min, priceCents: Math.round(price * 100) });
  }
  return tierRanges(rows).map((range, i) => ({
    sortOrder: i,
    nameRo: rangeLabel(range, "ro"),
    nameEn: rangeLabel(range, "en"),
    priceCents: range.priceCents,
    discountPercent: 0,
    minQuantity: rows.slice().sort((a, b) => a.minQuantity - b.minQuantity)[i]
      .minQuantity,
    pieces: [] as PieceInput[],
  }));
}

function readProductForm(formData: FormData) {
  const categoryId = String(formData.get("categoryId") || "");
  const slugInput = String(formData.get("slug") || "").trim();
  const roName = String(formData.get("roName") || "").trim();
  const roDescription = String(formData.get("roDescription") || "").trim();
  const roLongDescription = String(
    formData.get("roLongDescription") || "",
  ).trim();
  const enLongDescription = String(
    formData.get("enLongDescription") || "",
  ).trim();
  const enName = String(formData.get("enName") || "").trim();
  const enDescription = String(formData.get("enDescription") || "").trim();
  const priceRon = parseFloat(String(formData.get("priceRon") || ""));
  const quantityOnHand = parseInt(
    String(formData.get("quantityOnHand") || "0"),
    10,
  );
  const lowStockThreshold = parseInt(
    String(formData.get("lowStockThreshold") || "5"),
    10,
  );
  const isActive = formData.get("isActive") === "on";
  const hasColorOptions = formData.get("hasColorOptions") === "on";
  const tieredPricing = formData.get("tieredPricing") === "on";
  const variants = tieredPricing ? readTiers(formData) : readVariants(formData);
  const productPieces = tieredPricing ? [] : readProductPieces(formData);

  // With variants, the product price is the cheapest price a customer pays
  // ("from X"), after any discount.
  // Sets (variants with a discount) are priced from the other variants; the
  // saved full price follows, so the admin always shows the real number.
  const pricing = variantPricing(variants);
  variants.forEach((v, i) => {
    v.priceCents = pricing[i].fullCents;
  });
  const priceCents = variants.length
    ? Math.min(...pricing.map((p) => p.finalCents))
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
    tieredPricing,
    variants,
    productPieces,
    quantityOnHand: Number.isFinite(quantityOnHand) ? quantityOnHand : 0,
    lowStockThreshold: Number.isFinite(lowStockThreshold)
      ? lowStockThreshold
      : 5,
    isActive,
  };
}

type ProductFormData = ReturnType<typeof readProductForm>;

// Colour choices exist only in categories that use colours (3D prints). For any
// other category the product gets no colour option and no colour pieces.
async function applyColorRules(data: ProductFormData) {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { mainCategory: { select: { usesColors: true } } },
  });
  if (category?.mainCategory?.usesColors) return;
  data.hasColorOptions = false;
  data.productPieces = [];
  for (const variant of data.variants) variant.pieces = [];
}

// Writes the colour pieces: those of each variant, or the product's own pieces
// when it has no variants. Existing pieces keep their id, so customers' carts
// stay valid.
async function savePieces(
  productId: string,
  data: ProductFormData,
  dbVariants: { id: string; sortOrder: number }[],
) {
  const rows: (PieceInput & { variantId: string | null })[] = data.variants
    .length
    ? data.variants.flatMap((v) => {
        const variantId = dbVariants.find(
          (d) => d.sortOrder === v.sortOrder,
        )?.id;
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

const money = (cents: number) => `${(cents / 100).toFixed(2)} RON`;

type ProductSnapshot = {
  name: string;
  priceCents: number;
  isActive: boolean;
  tieredPricing: boolean;
  quantityOnHand: number | null;
  lowStockThreshold: number | null;
  variants: string;
};

// What the activity log needs to tell a change apart: price, stock, visibility.
async function productSnapshot(
  productId: string,
): Promise<ProductSnapshot | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      inventory: true,
      variants: { orderBy: { sortOrder: "asc" } },
      translations: { where: { locale: "ro" } },
    },
  });
  if (!product) return null;
  return {
    name: product.translations[0]?.name ?? product.slug,
    priceCents: product.priceCents,
    isActive: product.isActive,
    tieredPricing: product.tieredPricing,
    quantityOnHand: product.inventory?.quantityOnHand ?? null,
    lowStockThreshold: product.inventory?.lowStockThreshold ?? null,
    variants: product.variants
      .map(
        (v) =>
          `${v.sortOrder}:${v.priceCents}:${v.discountPercent ?? ""}:${v.minQuantity ?? ""}`,
      )
      .join("|"),
  };
}

function describeProductChanges(
  before: ProductSnapshot,
  after: ProductSnapshot,
): string {
  const changes: string[] = [];
  if (before.name !== after.name) {
    changes.push(`nume "${before.name}" → "${after.name}"`);
  }
  if (before.priceCents !== after.priceCents) {
    changes.push(
      `preț ${money(before.priceCents)} → ${money(after.priceCents)}`,
    );
  }
  if (before.variants !== after.variants) changes.push("variante/prețuri pe cantitate modificate");
  if (before.tieredPricing !== after.tieredPricing) {
    changes.push(
      after.tieredPricing
        ? "preț pe cantitate activat"
        : "preț pe cantitate dezactivat",
    );
  }
  if (before.quantityOnHand !== after.quantityOnHand) {
    changes.push(`stoc ${before.quantityOnHand ?? "-"} → ${after.quantityOnHand ?? "-"}`);
  }
  if (before.lowStockThreshold !== after.lowStockThreshold) {
    changes.push(
      `prag stoc redus ${before.lowStockThreshold ?? "-"} → ${after.lowStockThreshold ?? "-"}`,
    );
  }
  if (before.isActive !== after.isActive) {
    changes.push(after.isActive ? "produs activat (vizibil)" : "produs dezactivat (ascuns)");
  }
  return changes.length ? changes.join("; ") : "alte detalii (descrieri, poze, culori)";
}

export async function createProduct(
  formData: FormData,
): Promise<{ id: string } | { errors: FormErrors }> {
  const admin = await requireAdmin();
  const errors = {
    ...validateProductForm(formData),
    ...(await checkSlug(formData)),
    ...(await checkCategory(formData)),
  };
  if (hasErrors(errors)) return { errors };

  const data = readProductForm(formData);
  await applyColorRules(data);

  const created = await prisma.product.create({
    data: {
      categoryId: data.categoryId,
      slug: data.slug,
      priceCents: data.priceCents,
      currency: "RON",
      isActive: data.isActive,
      hasColorOptions: data.hasColorOptions,
      tieredPricing: data.tieredPricing,
      variants: {
        create: data.variants.map((v) => ({
          sortOrder: v.sortOrder,
          nameRo: v.nameRo,
          nameEn: v.nameEn,
          priceCents: v.priceCents,
          discountPercent: v.discountPercent,
          minQuantity: v.minQuantity,
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

  await logAdminAction(
    admin,
    "Produs creat",
    `${data.roName}; preț ${money(data.priceCents)}; stoc ${data.quantityOnHand}${data.isActive ? "" : "; ascuns"}`,
  );
  revalidatePath("/", "layout");
  return { id: created.id };
}

export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  const admin = await requireAdmin();
  const errors = {
    ...validateProductForm(formData),
    ...(await checkSlug(formData, productId)),
    ...(await checkCategory(formData)),
  };
  if (hasErrors(errors)) return { errors };

  const data = readProductForm(formData);
  await applyColorRules(data);
  const before = await productSnapshot(productId);

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      categoryId: data.categoryId,
      slug: data.slug,
      priceCents: data.priceCents,
      isActive: data.isActive,
      hasColorOptions: data.hasColorOptions,
      tieredPricing: data.tieredPricing,
      variants: {
        deleteMany: {
          sortOrder: { notIn: data.variants.map((v) => v.sortOrder) },
        },
        upsert: data.variants.map((v) => ({
          where: { productId_sortOrder: { productId, sortOrder: v.sortOrder } },
          create: {
            sortOrder: v.sortOrder,
            nameRo: v.nameRo,
            nameEn: v.nameEn,
            priceCents: v.priceCents,
            discountPercent: v.discountPercent,
            minQuantity: v.minQuantity,
          },
          update: {
            nameRo: v.nameRo,
            nameEn: v.nameEn,
            priceCents: v.priceCents,
            discountPercent: v.discountPercent,
            minQuantity: v.minQuantity,
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

  const after = await productSnapshot(productId);
  if (before && after) {
    await logAdminAction(
      admin,
      "Produs modificat",
      `${after.name}: ${describeProductChanges(before, after)}`,
    );
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") || "");
  if (!productId) return;

  const before = await productSnapshot(productId);
  await prisma.product.delete({ where: { id: productId } });
  await logAdminAction(admin, "Produs șters", before?.name ?? productId);

  revalidatePath("/", "layout");
  redirect("/admin/products");
}
