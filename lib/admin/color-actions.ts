"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import type { FormErrors } from "@/lib/admin/form-validation";
import {
  createColor,
  removeColor,
  setCategoryUsesColors,
  updateColor,
} from "@/lib/admin/color-core";

async function assertAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("unauthorized");
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function createColorAction(
  mainCategoryId: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | { ok: true }> {
  await assertAdmin();
  const result = await createColor(mainCategoryId, formData);
  if ("errors" in result) return result;
  refresh();
  return { ok: true };
}

export async function updateColorAction(
  id: string,
  formData: FormData,
): Promise<{ errors: FormErrors } | { ok: true }> {
  await assertAdmin();
  const result = await updateColor(id, formData);
  if ("errors" in result) return result;
  refresh();
  return { ok: true };
}

export async function deleteColorAction(
  id: string,
): Promise<{ error: string } | { ok: true }> {
  await assertAdmin();
  const result = await removeColor(id);
  if ("error" in result) return result;
  refresh();
  return { ok: true };
}

export async function setUsesColorsAction(
  mainCategoryId: string,
  value: boolean,
): Promise<{ ok: true }> {
  await assertAdmin();
  await setCategoryUsesColors(mainCategoryId, value);
  refresh();
  return { ok: true };
}
