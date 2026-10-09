"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import {
  hasErrors,
  validateCategoryForm,
  type FormErrors,
} from "@/lib/admin/form-validation";

async function assertAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("unauthorized");
}

async function checkSlug(
  formData: FormData,
  ignoreCategoryId?: string,
): Promise<FormErrors> {
  const slugInput = String(formData.get("slug") || "").trim();
  const roName = String(formData.get("roName") || "").trim();
  const slug = slugInput ? slugify(slugInput) : slugify(roName);
  if (!slug) {
    return {
      slug: "Nu pot crea adresa din acest text. Scrie manual una, cu litere și cifre.",
    };
  }
  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing && existing.id !== ignoreCategoryId) {
    return {
      slug: "Există deja o categorie cu această adresă (slug). Schimb-o sau lasă câmpul gol și modifică numele.",
    };
  }
  return {};
}
import type { ProductLine } from "@/lib/generated/prisma";

function readCategoryForm(formData: FormData) {
  const line = String(formData.get("line") || "EVENTS") as ProductLine;
  const slugInput = String(formData.get("slug") || "").trim();
  const roName = String(formData.get("roName") || "").trim();
  const roDescription = String(formData.get("roDescription") || "").trim();
  const enName = String(formData.get("enName") || "").trim();
  const enDescription = String(formData.get("enDescription") || "").trim();
  const sortOrder = parseInt(String(formData.get("sortOrder") || "0"), 10);

  return {
    line,
    slug: slugInput ? slugify(slugInput) : slugify(roName),
    roName,
    roDescription: roDescription || null,
    enName,
    enDescription: enDescription || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export async function createCategory(
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  await assertAdmin();
  const errors = { ...validateCategoryForm(formData), ...(await checkSlug(formData)) };
  if (hasErrors(errors)) return { errors };

  const data = readCategoryForm(formData);

  await prisma.category.create({
    data: {
      line: data.line,
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

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

export async function updateCategory(
  categoryId: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  await assertAdmin();
  const errors = {
    ...validateCategoryForm(formData),
    ...(await checkSlug(formData, categoryId)),
  };
  if (hasErrors(errors)) return { errors };

  const data = readCategoryForm(formData);

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      line: data.line,
      slug: data.slug,
      sortOrder: data.sortOrder,
      translations: {
        upsert: [
          {
            where: { categoryId_locale: { categoryId, locale: "ro" } },
            create: { locale: "ro", name: data.roName, description: data.roDescription },
            update: { name: data.roName, description: data.roDescription },
          },
          ...(data.enName
            ? [
                {
                  where: { categoryId_locale: { categoryId, locale: "en" } },
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
  redirect("/admin/categories");
}

export async function deleteCategory(formData: FormData) {
  await assertAdmin();
  const categoryId = String(formData.get("categoryId") || "");
  if (!categoryId) return;

  await prisma.category.delete({ where: { id: categoryId } });

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}
