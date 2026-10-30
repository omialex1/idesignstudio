// The name of a group's type as a small coloured badge: green for the kind that
// customers see ("Merge bine cu"), amber for a kind with a discount, grey else.
export default function TypeBadge({
  type,
}: {
  type: { name: string; showOnSite: boolean; hasDiscount: boolean };
}) {
  const colour = type.showOnSite
    ? "bg-green-100 text-green-800"
    : type.hasDiscount
      ? "bg-amber-100 text-amber-800"
      : "bg-cream-200 text-taupe-700";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${colour}`}>
      {type.name}
    </span>
  );
}
