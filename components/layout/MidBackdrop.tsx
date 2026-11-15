// A soft fade made of many steps shaped like a smooth "S" (zero slope at both ends).
// A plain two-color gradient has a sudden change of slope where it starts and ends,
// which the eye sees as a line. `length` is how long the fade is: a CSS length that may
// depend on the height of the block (e.g. "min(40%, 14rem)").
function fadeIn(direction: "to bottom" | "to top", length: string) {
  const steps = 12;
  const stops = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const smooth = t * t * t * (t * (t * 6 - 15) + 10);
    return `rgba(0,0,0,${smooth.toFixed(3)}) calc(${t.toFixed(4)} * ${length})`;
  });
  return `linear-gradient(${direction}, ${stops.join(", ")}, #000 ${length})`;
}

const MASK = [
  fadeIn("to bottom", "min(40%, 14rem)"),
  fadeIn("to top", "min(45%, 18rem)"),
].join(", ");

// A calm photo behind the middle of a page, over which the glass cards pass as the
// page scrolls (so their transparency shows). The photo stays in place on the screen
// and is only visible inside this block (the clip keeps it from covering the rest of
// the page, also on phones where a fixed background does not work by itself). The
// block's top and bottom fade out to nothing (a mask, not a colored overlay), so the
// photo melts into the page and never ends in a line. The photo file is already
// blurred and a light wash keeps it soft and the text readable.
export default function MidBackdrop({
  src,
  children,
}: {
  src: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [clip-path:inset(0)]"
        style={{
          maskImage: MASK,
          maskComposite: "intersect",
          WebkitMaskImage: MASK,
          WebkitMaskComposite: "source-in",
        }}
      >
        <div
          className="fixed inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${src})` }}
        />
        <div className="absolute inset-0 bg-cream-50/45" />
      </div>
      {children}
    </div>
  );
}
