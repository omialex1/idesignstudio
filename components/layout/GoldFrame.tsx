// A fine gold frame around a block of content (a row of products, a list of
// subcategories), to set it apart from the page. On phones only the top and bottom
// lines are drawn (the sides would be too close to the edge of the screen). It is not a closed rectangle: each
// side is a thin line over about 85% of its length, centered, fading out at both ends,
// and the corners are left open. The frame sits just outside the content (it uses the
// gutter of the page), so the content keeps the width it had.
const line =
  "pointer-events-none absolute bg-[length:100%_100%] opacity-95";
const h =
  "left-[7.5%] right-[7.5%] h-[1.5px] bg-[linear-gradient(to_right,transparent,var(--color-gold-400)_12%,var(--color-gold-400)_88%,transparent)]";
const v =
  "top-[7.5%] bottom-[7.5%] w-[1.5px] bg-[linear-gradient(to_bottom,transparent,var(--color-gold-400)_12%,var(--color-gold-400)_88%,transparent)]";

export default function GoldFrame({
  children,
  className = "",
  enabled = true,
  horizontal = true,
}: {
  children: React.ReactNode;
  className?: string;
  // false: the content as it is, without the frame
  enabled?: boolean;
  // false: only the sides are drawn (no top and bottom line), e.g. when the blocks are
  // separated by dots
  horizontal?: boolean;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <div
      className={`relative py-7 sm:-mx-6 sm:px-6 sm:py-9 ${className}`}
    >
      {horizontal && (
        <>
          <span aria-hidden="true" className={`${line} ${h} top-0`} />
          <span aria-hidden="true" className={`${line} ${h} bottom-0`} />
        </>
      )}
      <span aria-hidden="true" className={`${line} ${v} left-0 hidden sm:block`} />
      <span aria-hidden="true" className={`${line} ${v} right-0 hidden sm:block`} />
      {children}
    </div>
  );
}
