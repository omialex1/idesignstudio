import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";
import {
  hasErrors,
  validateSubcategoryForm,
  type FormErrors,
} from "@/lib/admin/form-validation";

export type SubcategoryResult =
  | { id: string; mainCategoryId: string; name: string }
  | { error: string };

// Creates a subcategory (a Category row) inside one of the main categories.
export async function createSubcategoryRecord(
  mainCategoryId: string,
  nameRo: string,
  nameEn: string,
): Promise<SubcategoryResult> {
  const ro = nameRo.trim().slice(0, 100);
  const en = nameEn.trim().slice(0, 100);

  const main = mainCategoryId
    ? await prisma.mainCategory.findUnique({
        where: { id: mainCategoryId },
        select: { id: true },
      })
    : null;
  if (!main) return { error: "Alege mai întâi categoria principală." };
  if (!ro) return { error: "Scrie numele subcategoriei în română." };

  const slug = slugify(ro);
  if (!slug) {
    return { error: "Numele trebuie să conțină litere sau cifre." };
  }
  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    return { error: "Există deja o subcategorie cu acest nume. Alege alt nume." };
  }

  const last = await prisma.category.aggregate({
    where: { mainCategoryId },
    _max: { sortOrder: true },
  });
  const created = await prisma.category.create({
    data: {
      mainCategoryId,
      slug,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
      translations: {
        create: [
          { locale: "ro", name: ro },
          ...(en ? [{ locale: "en", name: en }] : []),
        ],
      },
    },
  });

  return { id: created.id, mainCategoryId, name: ro };
}

// ---- Save / delete used by the admin forms (the actions only check the session) ----


function readSubcategoryForm(formData: FormData) {
  const slugInput = String(formData.get("slug") || "").trim();
  const roName = String(formData.get("roName") || "").trim();
  const roDescription = String(formData.get("roDescription") || "").trim();
  const enName = String(formData.get("enName") || "").trim();
  const enDescription = String(formData.get("enDescription") || "").trim();
  const sortOrder = parseInt(String(formData.get("sortOrder") || "0"), 10);

  return {
    mainCategoryId: String(formData.get("mainCategoryId") || ""),
    slug: slugInput ? slugify(slugInput) : slugify(roName),
    roName,
    roDescription: roDescription || null,
    enName,
    enDescription: enDescription || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

// Problems only the database can tell: unknown main category, address in use.
async function checkAgainstDatabase(
  data: ReturnType<typeof readSubcategoryForm>,
  ignoreCategoryId?: string,
): Promise<FormErrors> {
  const errors: FormErrors = {};

  if (data.mainCategoryId) {
    const main = await prisma.mainCategory.findUnique({
      where: { id: data.mainCategoryId },
      select: { id: true },
    });
    if (!main) errors.mainCategoryId = "Categoria principală aleasă nu mai există.";
  }

  if (!data.slug) {
    errors.slug =
      "Nu pot crea adresa din acest text. Scrie manual una, cu litere și cifre.";
  } else {
    const existing = await prisma.category.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (existing && existing.id !== ignoreCategoryId) {
      errors.slug =
        "Există deja o subcategorie cu această adresă (slug). Schimb-o sau lasă câmpul gol și modifică numele.";
    }
  }
  return errors;
}

// Creates (id = null) or updates a subcategory.
export async function saveSubcategory(
  id: string | null,
  formData: FormData,
): Promise<{ errors: FormErrors } | { id: string }> {
  const data = readSubcategoryForm(formData);
  const errors = {
    ...validateSubcategoryForm(formData),
    ...(await checkAgainstDatabase(data, id ?? undefined)),
  };
  if (hasErrors(errors)) return { errors };

  if (id === null) {
    const created = await prisma.category.create({
      data: {
        mainCategoryId: data.mainCategoryId,
        slug: data.slug,
        sortOrder: data.sortOrder,
        translations: {
          create: [
            { locale: "ro", name: data.roName, description: data.roDescription },
            ...(data.enName
              ? [{ locale: "en", name: data.enName, description: data.enDescription }]
              : []),
          ],
        },
      },
    });
    return { id: created.id };
  }

  await prisma.category.update({
    where: { id },
    data: {
      mainCategoryId: data.mainCategoryId,
      slug: data.slug,
      sortOrder: data.sortOrder,
      translations: {
        upsert: [
          {
            where: { categoryId_locale: { categoryId: id, locale: "ro" } },
            create: { locale: "ro", name: data.roName, description: data.roDescription },
            update: { name: data.roName, description: data.roDescription },
          },
          ...(data.enName
            ? [
                {
                  where: { categoryId_locale: { categoryId: id, locale: "en" } },
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
  return { id };
}

// Refused while the subcategory still holds products, so none disappear by accident.
export async function removeSubcategory(
  id: string,
): Promise<{ error: string } | { ok: true }> {
  const products = await prisma.product.count({ where: { categoryId: id } });
  if (products > 0) {
    return {
      error: `Nu pot șterge: subcategoria are ${products} ${products === 1 ? "produs" : "produse"}. Mută-le în altă subcategorie sau șterge-le întâi.`,
    };
  }
  await prisma.category.delete({ where: { id } });
  return { ok: true };
}
