import { colorLabel } from "@/lib/colors";

type ColorLabels = Record<string, { ro?: string; en?: string }>;

type Choice = {
  component?: string | null;
  componentName?: string | null;
  colors: string[];
  // colour names saved with the choice (needed for colours made in the admin)
  labels?: ColorLabels;
};

type ItemOptions = {
  variantName?: string | null;
  // Per-component colour picks (cart items and new orders)...
  colorChoices?: unknown;
  // ...or the flat list kept on older orders.
  colors?: string[];
  colorNote?: string | null;
};

function parseChoices(value: unknown): Choice[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (c): c is Choice =>
      !!c &&
      typeof c === "object" &&
      Array.isArray((c as Choice).colors) &&
      (c as Choice).colors.every((x) => typeof x === "string"),
  );
}

function nameOf(id: string, locale: string, labels?: ColorLabels) {
  const saved = labels?.[id];
  const own = locale === "en" ? saved?.en : saved?.ro;
  return own || colorLabel(id, locale);
}

// One short line describing the chosen options, e.g.
// "Mare · Cutie: Alb os · Capac: Caramel · Notă: capacul alb".
export function itemDetails(item: ItemOptions, locale: string): string {
  const en = locale === "en";
  const parts: string[] = [];
  if (item.variantName) parts.push(item.variantName);

  const choices = parseChoices(item.colorChoices);
  if (choices.length > 0) {
    for (const choice of choices) {
      const names = choice.colors
        .map((c) => nameOf(c, locale, choice.labels))
        .join(", ");
      const label = choice.component ?? choice.componentName ?? null;
      parts.push(`${label ?? (en ? "Colours" : "Culori")}: ${names}`);
    }
  } else if (item.colors && item.colors.length > 0) {
    const names = item.colors.map((c) => colorLabel(c, locale)).join(", ");
    parts.push(`${en ? "Colours" : "Culori"}: ${names}`);
  }

  if (item.colorNote) parts.push(`${en ? "Note" : "Notă"}: ${item.colorNote}`);
  return parts.join(" · ");
}
