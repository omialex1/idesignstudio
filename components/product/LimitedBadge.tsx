// The small "Limited edition" label that sits on a product photo. Put it in a `relative`
// box that has the photo; `position` places it.
export default function LimitedBadge({
  label,
  position = "bottom",
}: {
  label: string;
  position?: "bottom" | "top-left";
}) {
  return (
    <span
      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-full bg-gold-300 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-taupe-800 shadow-sm ring-1 ring-white/70 sm:text-[11px] ${
        position === "bottom"
          ? "bottom-[7%] left-1/2 -translate-x-1/2"
          : "top-3 left-3 sm:top-4 sm:left-4"
      }`}
    >
      {label}
    </span>
  );
}
