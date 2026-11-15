// A solid gold dot that separates two framed blocks on the homepage. It is placed
// absolutely, centered on the edge of the section it belongs to (use `-top-[7.5px]`
// on the section that comes after the gap).
export default function GoldDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 h-[15px] w-[15px] -translate-x-1/2 rounded-full bg-gold-400 ${className}`}
    />
  );
}
