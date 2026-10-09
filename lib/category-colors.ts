// Colours offered for a main category's placeholder tiles (shown while a
// category or product has no photo). Written out in full so Tailwind sees the
// class names.
export const CATEGORY_COLORS = [
  { key: "salamander", label: "Somon", className: "bg-salamander-400 text-cream-50" },
  { key: "tangerine", label: "Mandarină", className: "bg-tangerine-400 text-cream-50" },
  { key: "cream", label: "Crem", className: "bg-cream-200 text-taupe-800" },
  { key: "taupe", label: "Maro-gri", className: "bg-taupe-500 text-cream-50" },
  { key: "salamander-dark", label: "Roșu închis", className: "bg-salamander-600 text-cream-50" },
  { key: "taupe-dark", label: "Maro închis", className: "bg-taupe-700 text-cream-50" },
] as const;

export function isCategoryColor(key: string) {
  return CATEGORY_COLORS.some((c) => c.key === key);
}

export function categoryColorClass(key: string | null | undefined) {
  return (
    CATEGORY_COLORS.find((c) => c.key === key)?.className ??
    CATEGORY_COLORS[0].className
  );
}
