import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";
import {
  hasErrors,
  validateMainCategoryForm,
  type FormErrors,
} from "@/lib/admin/form-validation";
import { RESERVED_SLUGS } from "@/lib/main-categories";

// Database logic for main categories, kept apart from the server actions
// (which only check the admin session) so it can be tested directly.

function readForm(formData: FormData) {
  const text = (key: string) => String(formData.get(key) || "").trim();
  const sortOrder = parseInt(text("sortOrder") || "0", 10);
  return {
    slugInput: text("slug"),
    roName: text("roName"),
    enName: text("enName"),
    roHeadline: text("roHeadline") || null,
    enHeadline: text("enHeadline") || null,
    roDescription: text("roDescription") || null,
    enDescription: text("enDescription") || null,
    color: text("color"),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

function translationRows(data: ReturnType<typeof readForm>) {
  return [
    {
      locale: "ro",
      name: data.roName,
      headline: data.roHeadline,
      description: data.roDescription,
    },
    ...(data.enName
      ? [
          {
            locale: "en",
            name: data.enName,
            headline: data.enHeadline,
            description: data.enDescription,
          },
        ]
      : []),
  ];
}

// The address (slug) is fixed when the category is created, so links stay valid.
async function checkNewSlug(
  data: ReturnType<typeof readForm>,
): Promise<{ errors: FormErrors; slug: string }> {
  const slug = data.slugInput ? slugify(data.slugInput) : slugify(data.roName);
  const errors: FormErrors = {};
  if (!slug) {
    errors.slug =
      "Nu pot crea adresa din acest text. Scrie manual una, cu litere și cifre.";
  } else if (RESERVED_SLUGS.includes(slug)) {
    errors.slug = "Această adresă e folosită de altă pagină a site-ului. Alege alta.";
  } else if (
    await prisma.mainCategory.findUnique({ where: { slug }, select: { id: true } })
  ) {
    errors.slug = "Există deja o categorie cu această adresă (slug). Alege alta.";
  }
  return { errors, slug };
}

// Creates (id = null) or updates a main category.
export async function saveMainCategory(
  id: string | null,
  formData: FormData,
): Promise<{ errors: FormErrors } | { id: string }> {
  const data = readForm(formData);

  if (id === null) {
    const slugCheck = await checkNewSlug(data);
    const errors = { ...validateMainCategoryForm(formData), ...slugCheck.errors };
    if (hasErrors(errors)) return { errors };

    const created = await prisma.mainCategory.create({
      data: {
        slug: slugCheck.slug,
        sortOrder: data.sortOrder,
        color: data.color,
        translations: { create: translationRows(data) },
      },
    });
    return { id: created.id };
  }

  const errors = validateMainCategoryForm(formData);
  if (hasErrors(errors)) return { errors };

  await prisma.mainCategory.update({
    where: { id },
    data: {
      // the address stays as it was
      sortOrder: data.sortOrder,
      color: data.color,
      translations: {
        upsert: translationRows(data).map((row) => ({
          where: {
            mainCategoryId_locale: { mainCategoryId: id, locale: row.locale },
          },
          create: row,
          update: {
            name: row.name,
            headline: row.headline,
            description: row.description,
          },
        })),
      },
    },
  });
  return { id };
}

// Refused while the category still has subcategories, so nothing is lost by accident.
export async function removeMainCategory(
  id: string,
): Promise<{ error: string } | { ok: true }> {
  const subcategories = await prisma.category.count({
    where: { mainCategoryId: id },
  });
  if (subcategories > 0) {
    return {
      error: `Nu pot șterge: categoria are ${subcategories} ${subcategories === 1 ? "subcategorie" : "subcategorii"}. Mută-le sau șterge-le întâi.`,
    };
  }
  await prisma.mainCategory.delete({ where: { id } });
  return { ok: true };
}
