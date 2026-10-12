// Shared by the admin colour menu (browser and server): hex handling.

// Accepts "#c0a080", "C0A080" or the short "#ca8"; returns "#RRGGBB" in
// upper case, or null when it is not a colour value.
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}
