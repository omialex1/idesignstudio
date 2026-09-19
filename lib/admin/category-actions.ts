"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";
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

export async function createCategory(formData: FormData) {
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

export async function updateCategory(categoryId: string, formData: FormData) {
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
  const categoryId = String(formData.get("categoryId") || "");
  if (!categoryId) return;

  await prisma.category.delete({ where: { id: categoryId } });

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}
