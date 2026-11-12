import { Link } from "@/i18n/navigation";

// Product names carry the search keywords after a dash ("MORRA – cu drenaj și
// farfurie"); on cards only the part before the dash is shown.
export function shortName(name: string) {
  return name.split(" – ")[0];
}

// The product card of the lists (a subcategory, search, favorites): a white card
// with a round photo, the name, and a bottom row with the price and the buttons
// (`actions`: the heart and the cart). The photo and the name are the link to the
// product; the photo has no ring and no shadow.
export default function ProductTile({
  href,
  name,
  imageUrl,
  placeholderClass,
  priceLabel,
  oldPriceLabel,
  badge,
  note,
  actions,
}: {
  href: string;
  name: string;
  imageUrl: string | null;
  placeholderClass: string;
  priceLabel?: string;
  // with a discount: the prior price (struck through) and e.g. "−30% · Black Friday"
  oldPriceLabel?: string;
  badge?: string;
  note?: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-cream-200 bg-paper px-1.5 pt-2.5 text-center shadow-[0_4px_12px_rgba(60,40,25,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_8px_18px_rgba(60,40,25,0.16)] sm:px-2.5 sm:pt-3.5">
      <Link href={href} className="flex flex-1 flex-col">
        {/* always a circle: a square box that cannot be squeezed, the photo cropped to fill it */}
        <div className="mx-auto w-[84%] shrink-0 lg:w-[82%]">
          <div className="relative aspect-square shrink-0 overflow-hidden rounded-full">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center font-display text-4xl ${placeholderClass}`}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-0.5 pt-2 sm:pt-2.5">
          <h3 className="font-display text-[11px] leading-tight text-taupe-800 sm:text-sm">
            {name}
          </h3>
          {badge && (
            <span className="mt-1 rounded-full bg-salamander-500 px-1.5 py-0.5 text-[9px] font-semibold text-cream-50 sm:text-[10px]">
              {badge}
            </span>
          )}
          {note && (
            <span className="mt-1 text-[10px] text-red-600 sm:text-[11px]">
              {note}
            </span>
          )}
        </div>
      </Link>
      {/* stacked on phones and tablets; price and buttons side by side on wide screens */}
      <div className="mt-2 flex flex-col items-center gap-1.5 border-t border-cream-200 py-2 lg:flex-row lg:justify-between lg:py-2.5">
        {priceLabel && (
          <span className="text-[10px] leading-tight font-semibold text-salamander-600 sm:text-xs lg:text-left">
            {oldPriceLabel && (
              <span className="mr-1.5 font-normal text-taupe-400 line-through">
                {oldPriceLabel}
              </span>
            )}
            {priceLabel}
          </span>
        )}
        {actions}
      </div>
    </div>
  );
}
