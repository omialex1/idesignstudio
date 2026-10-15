"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import type { FormErrors } from "@/lib/admin/form-validation";
import {
  createColor,
  removeColor,
  setCategoryUsesColors,
  updateColor,
} from "@/lib/admin/color-core";

async function mainCategoryName(id: string) {
  const category = await prisma.mainCategory.findUnique({
    where: { id },
    select: { slug: true },
  });
  return category?.slug;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function createColorAction(
  mainCategoryId: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | { ok: true }> {
  const admin = await requireAdmin();
  const result = await createColor(mainCategoryId, formData);
  if ("errors" in result) return result;
  await logAdminAction(admin, "Culoare adăugată", String(formData.get("nameRo") ?? ""));
  refresh();
  return { ok: true };
}

export async function updateColorAction(
  id: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | { ok: true }> {
  const admin = await requireAdmin();
  const result = await updateColor(id, formData);
  if ("errors" in result) return result;
  await logAdminAction(admin, "Culoare modificată", String(formData.get("nameRo") ?? ""));
  refresh();
  return { ok: true };
}

export async function deleteColorAction(
  id: string,
): Promise<{ error: string } | { ok: true }> {
  const admin = await requireAdmin();
  const color = await prisma.color.findUnique({
    where: { id },
    select: { nameRo: true },
  });
  const result = await removeColor(id);
  if ("error" in result) return result;
  await logAdminAction(admin, "Culoare ștearsă", color?.nameRo);
  refresh();
  return { ok: true };
}

export async function setUsesColorsAction(
  mainCategoryId: string,
  value: boolean,
): Promise<{ ok: true }> {
  const admin = await requireAdmin();
  await setCategoryUsesColors(mainCategoryId, value);
  await logAdminAction(
    admin,
    value ? "Categorie: culori activate" : "Categorie: culori dezactivate",
    await mainCategoryName(mainCategoryId),
  );
  refresh();
  return { ok: true };
}
