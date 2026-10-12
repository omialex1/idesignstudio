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

// Look of a colour without its own photo: the colour with the same soft sheen
// the photographed filament swatches have (public/colors/texture.webp), so
// colours added later look like the existing ones, not like flat paint.
export function swatchStyle(hex: string): {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundBlendMode: string;
} {
  return {
    backgroundColor: normalizeHex(hex) ?? "#CCCCCC",
    backgroundImage: "url(/colors/texture.webp)",
    backgroundSize: "cover",
    backgroundBlendMode: "overlay",
  };
}
