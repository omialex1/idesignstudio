import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";
import { normalizeHex } from "@/lib/colors-shared";
import type { FormErrors } from "@/lib/admin/form-validation";

// Database logic for the colour menu, kept apart from the server actions
// (which only check the admin session) so it can be tested directly.

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export function validateColorForm(fd: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!text(fd, "nameRo")) errors.nameRo = "Completează numele în română.";
  if (!normalizeHex(text(fd, "hex"))) {
    errors.hex = "Scrie o valoare hex validă, ex: #C0A080.";
  }
  const order = text(fd, "sortOrder");
  if (order !== "" && !/^-?\d+$/.test(order)) {
    errors.sortOrder = "Numărul trebuie să fie un număr întreg.";
  }
  return errors;
}

function readColor(fd: FormData) {
  const nameRo = text(fd, "nameRo");
  const sortOrder = parseInt(text(fd, "sortOrder") || "0", 10);
  return {
    nameRo,
    nameEn: text(fd, "nameEn") || nameRo,
    hex: normalizeHex(text(fd, "hex")) ?? "#000000",
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: fd.get("isActive") === "on",
  };
}

// The slug is stored on orders, so it is made once and never changes.
async function freeSlug(base: string) {
  const root = slugify(base) || "culoare";
  let slug = root;
  for (let n = 2; await prisma.color.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${root}-${n}`;
  }
  return slug;
}

export async function createColor(
  mainCategoryId: string,
  fd: FormData,
): Promise<{ errors: FormErrors } | { id: string }> {
  const errors = validateColorForm(fd);
  if (Object.keys(errors).length > 0) return { errors };
  const data = readColor(fd);
  const last = await prisma.color.aggregate({
    where: { mainCategoryId },
    _max: { sortOrder: true },
  });
  const created = await prisma.color.create({
    data: {
      slug: await freeSlug(data.nameEn),
      mainCategoryId,
      nameRo: data.nameRo,
      nameEn: data.nameEn,
      hex: data.hex,
      // a new colour starts active unless the box is explicitly absent
      isActive: true,
      sortOrder: fd.get("sortOrder") ? data.sortOrder : (last._max.sortOrder ?? 0) + 1,
    },
  });
  return { id: created.id };
}

export async function updateColor(
  id: string,
  fd: FormData,
): Promise<{ errors: FormErrors } | { id: string }> {
  const errors = validateColorForm(fd);
  if (Object.keys(errors).length > 0) return { errors };
  const data = readColor(fd);
  await prisma.color.update({
    where: { id },
    data: {
      nameRo: data.nameRo,
      nameEn: data.nameEn,
      hex: data.hex,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });
  return { id };
}

// True when the colour appears on any order, so deleting it would lose the
// name production saw.
export async function colorUsedInOrders(slug: string): Promise<boolean> {
  const items = await prisma.orderItem.findMany({
    select: { colors: true, colorChoices: true },
  });
  return items.some(
    (item) =>
      item.colors.includes(slug) ||
      JSON.stringify(item.colorChoices ?? "").includes(`"${slug}"`),
  );
}

export async function removeColor(
  id: string,
): Promise<{ error: string } | { ok: true }> {
  const color = await prisma.color.findUnique({ where: { id } });
  if (!color) return { ok: true };
  if (await colorUsedInOrders(color.slug)) {
    return {
      error:
        "Culoarea apare pe comenzi deja făcute, deci nu o pot șterge. Debifează „Activă” ca să nu mai poată fi aleasă.",
    };
  }
  await prisma.color.delete({ where: { id } });
  return { ok: true };
}

export async function setCategoryUsesColors(mainCategoryId: string, value: boolean) {
  await prisma.mainCategory.update({
    where: { id: mainCategoryId },
    data: { usesColors: value },
  });
}
