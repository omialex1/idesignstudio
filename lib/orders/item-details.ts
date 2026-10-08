import { colorLabel } from "@/lib/colors";

type ItemOptions = {
  variantName?: string | null;
  colors: string[];
  colorNote?: string | null;
};

// One short line describing the chosen options, e.g.
// "Mare · Culori: Alb os, Caramel · Notă: capacul alb".
export function itemDetails(item: ItemOptions, locale: string): string {
  const en = locale === "en";
  const parts: string[] = [];
  if (item.variantName) parts.push(item.variantName);
  if (item.colors.length > 0) {
    const names = item.colors.map((c) => colorLabel(c, locale)).join(", ");
    parts.push(`${en ? "Colours" : "Culori"}: ${names}`);
  }
  if (item.colorNote) parts.push(`${en ? "Note" : "Notă"}: ${item.colorNote}`);
  return parts.join(" · ");
}
