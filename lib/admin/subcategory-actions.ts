"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import type { FormErrors } from "@/lib/admin/form-validation";
import {
  createSubcategoryRecord,
  removeSubcategory,
  saveSubcategory,
  type SubcategoryResult,
} from "@/lib/admin/subcategory";

export async function createSubcategoryFromForm(
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  const admin = await requireAdmin();
  const result = await saveSubcategory(null, formData);
  if ("errors" in result) return result;
  await logAdminAction(admin, "Subcategorie creată", String(formData.get("roName") ?? ""));

  revalidatePath("/", "layout");
  redirect("/admin/subcategories");
}

export async function updateSubcategory(
  categoryId: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  const admin = await requireAdmin();
  const result = await saveSubcategory(categoryId, formData);
  if ("errors" in result) return result;
  await logAdminAction(admin, "Subcategorie modificată", String(formData.get("roName") ?? ""));

  revalidatePath("/", "layout");
  redirect("/admin/subcategories");
}

export async function deleteSubcategory(
  categoryId: string,
): Promise<{ error: string } | void> {
  const admin = await requireAdmin();
  const before = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  });
  const result = await removeSubcategory(categoryId);
  if ("error" in result) return result;
  await logAdminAction(admin, "Subcategorie ștearsă", before?.slug);

  revalidatePath("/", "layout");
  redirect("/admin/subcategories");
}

// Quick-create used from the product form: makes a subcategory right away and
// returns it, so the form can select it without leaving the page.
export async function createSubcategory(
  mainCategoryId: string,
  nameRo: string,
  nameEn: string,
): Promise<SubcategoryResult> {
  const admin = await requireAdmin();
  const result = await createSubcategoryRecord(mainCategoryId, nameRo, nameEn);
  if (!("error" in result)) {
    await logAdminAction(admin, "Subcategorie creată (din produs)", nameRo);
    revalidatePath("/", "layout");
  }
  return result;
}
