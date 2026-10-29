import { prisma } from "@/lib/db/client";

// A colour as the shop shows it. `id` is the colour's slug, the value stored
// on carts and orders.
export type PaletteColor = {
  id: string;
  ro: string;
  en: string;
  hex: string;
  // photo swatch (texture) when the colour has one, otherwise the hex is drawn
  swatchUrl: string | null;
};

// Colours customers can pick for the products of one main category, in the
// order set in the admin. Empty for categories without colours.
export async function getPaletteColors(
  mainCategoryId: string,
  // colours this product does not offer (slugs)
  excluded: string[] = [],
): Promise<PaletteColor[]> {
  const rows = await prisma.color.findMany({
    where: { mainCategoryId, isActive: true, mainCategory: { usesColors: true } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows
    .filter((c) => !excluded.includes(c.slug))
    .map((c) => ({
    id: c.slug,
    ro: c.nameRo,
    en: c.nameEn,
    hex: c.hex,
    swatchUrl: c.swatchImage ? `/colors/${c.slug}.webp` : null,
  }));
}
