import type { ProductLine } from "@/lib/generated/prisma";

export type NavKey = "events" | "handmade" | "stationary" | "homeLifestyle";

type LineConfig = {
  line: ProductLine;
  slug: string;
  navKey: NavKey;
  adminLabel: string;
  // Colored block shown when a product or category has no photo yet.
  placeholderClass: string;
};

// Order here is the order shown in the menu and on the homepage.
export const LINES: readonly LineConfig[] = [
  {
    line: "EVENTS",
    slug: "events",
    navKey: "events",
    adminLabel: "Evenimente",
    placeholderClass: "bg-salamander-400 text-cream-50",
  },
  {
    line: "HANDMADE",
    slug: "handmade",
    navKey: "handmade",
    adminLabel: "Handmade",
    placeholderClass: "bg-tangerine-400 text-cream-50",
  },
  {
    line: "STATIONARY",
    slug: "stationary",
    navKey: "stationary",
    adminLabel: "Papetărie",
    placeholderClass: "bg-cream-200 text-taupe-800",
  },
  {
    line: "HOME_LIFESTYLE",
    slug: "home-lifestyle",
    navKey: "homeLifestyle",
    adminLabel: "Casă și stil de viață",
    placeholderClass: "bg-taupe-500 text-cream-50",
  },
];

export function lineFromSlug(slug: string) {
  return LINES.find((l) => l.slug === slug) ?? null;
}

export function lineConfig(line: ProductLine) {
  return LINES.find((l) => l.line === line)!;
}

export function lineSlug(line: ProductLine) {
  return lineConfig(line).slug;
}
