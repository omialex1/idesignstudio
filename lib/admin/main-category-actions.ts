"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import type { FormErrors } from "@/lib/admin/form-validation";
import {
  removeMainCategory,
  saveMainCategory,
} from "@/lib/admin/main-category-core";

export async function createMainCategory(
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  const admin = await requireAdmin();
  const result = await saveMainCategory(null, formData);
  if ("errors" in result) return result;
  await logAdminAction(admin, "Categorie principală creată", String(formData.get("roName") ?? ""));

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

export async function updateMainCategory(
  id: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | void> {
  const admin = await requireAdmin();
  const result = await saveMainCategory(id, formData);
  if ("errors" in result) return result;
  await logAdminAction(admin, "Categorie principală modificată", String(formData.get("roName") ?? ""));

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

export async function deleteMainCategory(
  id: string,
): Promise<{ error: string } | void> {
  const admin = await requireAdmin();
  const before = await prisma.mainCategory.findUnique({
    where: { id },
    select: { slug: true },
  });
  const result = await removeMainCategory(id);
  if ("error" in result) return result;
  await logAdminAction(admin, "Categorie principală ștearsă", before?.slug);

  revalidatePath("/", "layout");
  redirect("/admin/categories");
}
