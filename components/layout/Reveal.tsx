import type { CSSProperties, ReactNode } from "react";

// Wrapper that fades and rises into place on scroll (see ScrollEffects).
// `index` staggers items that appear together, e.g. cards in a grid.
export default function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <div
      data-reveal
      className={className}
      style={{ "--reveal-delay": `${Math.min(index, 6) * 90}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
