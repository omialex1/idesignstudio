// Palette offered to customers for made-to-order products. The id is stored on
// the order, so production always sees the same names whatever the site language.
export const MAX_COLORS = 3;
// Id of the single generic picker used when a product lists no components.
export const DEFAULT_COMPONENT_ID = "default";
export const MAX_COLOR_NOTE_LENGTH = 200;

export const COLORS = [
  { id: "bone-white", ro: "Alb os", en: "Bone white" },
  { id: "latte-brown", ro: "Maro latte", en: "Latte brown" },
  { id: "caramel", ro: "Caramel", en: "Caramel" },
  { id: "terracotta", ro: "Teracotă", en: "Terracotta" },
  { id: "dark-brown", ro: "Maro închis", en: "Dark brown" },
  { id: "marble-concrete", ro: "Beton marmorat", en: "Marble concrete" },
  { id: "dark-chocolate", ro: "Ciocolată neagră", en: "Dark chocolate" },
  { id: "dark-green", ro: "Verde închis", en: "Dark green" },
  { id: "desert-tan", ro: "Bej deșert", en: "Desert tan" },
  { id: "dark-blue", ro: "Albastru închis", en: "Dark blue" },
  { id: "nardo-gray", ro: "Gri Nardo", en: "Nardo gray" },
] as const;

export type ColorId = (typeof COLORS)[number]["id"];

const COLOR_IDS = new Set<string>(COLORS.map((c) => c.id));

export function isColorId(value: unknown): value is ColorId {
  return typeof value === "string" && COLOR_IDS.has(value);
}

export function colorLabel(id: string, locale: string) {
  const color = COLORS.find((c) => c.id === id);
  if (!color) return id;
  return locale === "en" ? color.en : color.ro;
}

export function colorSwatchUrl(id: string) {
  return `/colors/${id}.webp`;
}
