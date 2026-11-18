// The footer background: warm black with a fine "stucco" texture (a light grain with
// very soft clouds). Drawn with SVG noise, so there is no image to download.
export const FOOTER_COLOR = "#1d1b1c";

function noiseTile(
  frequency: string | number,
  octaves: number,
  alpha: number,
  size: number,
) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 1 0 0 0 0 0.88 0 0 0 0 0.78 ${alpha} 0 0 0 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// the very soft clouds are a little warmer and bigger than the grain
function cloudsTile(alpha: number) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.008 0.012' numOctaves='4' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 1 0 0 0 0 0.85 0 0 0 0 0.7 ${alpha} 0 0 0 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const FOOTER_TEXTURE = `${noiseTile(0.9, 2, 0.1, 240)}, ${cloudsTile(0.1)}`;
