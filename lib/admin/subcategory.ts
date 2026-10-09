import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/admin/slug";
import { LINES } from "@/lib/lines";
import type { ProductLine } from "@/lib/generated/prisma";

export type SubcategoryResult =
  | { id: string; line: ProductLine; name: string }
  | { error: string };

// Creates a subcategory (a Category row) inside one of the main categories.
export async function createSubcategoryRecord(
  line: ProductLine,
  nameRo: string,
  nameEn: string,
): Promise<SubcategoryResult> {
  const ro = nameRo.trim().slice(0, 100);
  const en = nameEn.trim().slice(0, 100);
  if (!LINES.some((l) => l.line === line)) {
    return { error: "Alege mai întâi categoria principală." };
  }
  if (!ro) return { error: "Scrie numele subcategoriei în română." };

  const slug = slugify(ro);
  if (!slug) {
    return { error: "Numele trebuie să conțină litere sau cifre." };
  }
  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    return { error: "Există deja o subcategorie cu acest nume. Alege alt nume." };
  }

  const last = await prisma.category.aggregate({
    where: { line },
    _max: { sortOrder: true },
  });
  const created = await prisma.category.create({
    data: {
      line,
      slug,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
      translations: {
        create: [
          { locale: "ro", name: ro },
          ...(en ? [{ locale: "en", name: en }] : []),
        ],
      },
    },
  });

  return { id: created.id, line, name: ro };
}
