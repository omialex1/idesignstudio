import { Link } from "@/i18n/navigation";
import ProductPhoto from "@/components/product/ProductPhoto";
import LimitedBadge from "@/components/product/LimitedBadge";

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
  badge,
  note,
  limitedLabel,
  actions,
  priority = false,
}: {
  href: string;
  name: string;
  imageUrl: string | null;
  placeholderClass: string;
  // with a discount: e.g. "−30% · Black Friday"
  badge?: string;
  note?: string;
  // small "Limited edition" label (products of the Season and gifts subcategory)
  limitedLabel?: string;
  actions: React.ReactNode;
  // the first cards of a page: their photo is loaded first
  priority?: boolean;
}) {
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-cream-200 bg-paper px-1.5 pt-2.5 text-center shadow-[0_4px_12px_rgba(60,40,25,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_8px_18px_rgba(60,40,25,0.16)] sm:px-2.5 sm:pt-3.5">
      <Link href={href} className="flex flex-1 flex-col">
        {/* always a circle: a square box that cannot be squeezed, the photo cropped to fill it */}
        <div className="relative mx-auto w-[84%] shrink-0 lg:w-[82%]">
          <div className="relative aspect-square shrink-0 overflow-hidden rounded-full">
            {imageUrl ? (
              <ProductPhoto
                src={imageUrl}
                alt={name}
                sizes="(min-width: 640px) 200px, 150px"
                priority={priority}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center font-display text-4xl ${placeholderClass}`}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {limitedLabel && <LimitedBadge label={limitedLabel} />}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-0.5 py-2 sm:py-2.5">
          <h3 className="font-display text-base leading-tight font-bold text-taupe-800 sm:text-[17px]">
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
      {/* the bottom of the card: price, heart and the cart button (pinned to the bottom) */}
      <div className="mt-2 border-t border-cream-200 py-2.5">{actions}</div>
    </div>
  );
}
