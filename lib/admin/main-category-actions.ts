"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import type { FormErrors } from "@/lib/admin/form-validation";
import {
  removeMainCategory,
  saveMainCategory,
} from "@/lib/admin/main-category-core";

async function assertAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("unauthorized");
}

export async function createMainCategory(
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  await assertAdmin();
  const result = await saveMainCategory(null, formData);
  if ("errors" in result) return result;

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

export async function updateMainCategory(
  id: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  await assertAdmin();
  const result = await saveMainCategory(id, formData);
  if ("errors" in result) return result;

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

export async function deleteMainCategory(
  id: string,
): Promise<{ error: string } | void> {
  await assertAdmin();
  const result = await removeMainCategory(id);
  if ("error" in result) return result;

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}
