"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import type { FormErrors } from "@/lib/admin/form-validation";
import {
  createSubcategoryRecord,
  removeSubcategory,
  saveSubcategory,
  type SubcategoryResult,
} from "@/lib/admin/subcategory";

async function assertAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("unauthorized");
}

export async function createSubcategoryFromForm(
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  await assertAdmin();
  const result = await saveSubcategory(null, formData);
  if ("errors" in result) return result;

  revalidatePath("/", "layout");
  redirect("/admin/subcategories");
}

export async function updateSubcategory(
  categoryId: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  await assertAdmin();
  const result = await saveSubcategory(categoryId, formData);
  if ("errors" in result) return result;

  revalidatePath("/", "layout");
  redirect("/admin/subcategories");
}

export async function deleteSubcategory(
  categoryId: string,
): Promise<{ error: string } | void> {
  await assertAdmin();
  const result = await removeSubcategory(categoryId);
  if ("error" in result) return result;

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
  await assertAdmin();
  const result = await createSubcategoryRecord(mainCategoryId, nameRo, nameEn);
  if (!("error" in result)) revalidatePath("/", "layout");
  return result;
}
