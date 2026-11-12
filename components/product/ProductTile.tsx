import { Link } from "@/i18n/navigation";

// Product names carry the search keywords after a dash ("MORRA – cu drenaj și
// farfurie"); on cards only the part before the dash is shown.
export function shortName(name: string) {
  return name.split(" – ")[0];
}

// Card with a round photo, the name and the price inside. Used for products on the
// homepage and in category lists, and for categories.
// - Product cards pass `actions` (the heart and cart buttons): the photo has no ring,
//   the price sits in a bottom row next to the buttons, and the photo and name are
//   the link to the product.
// - Category cards pass `textured`: a soft blurred photo background (a portion of
//   the hero backdrop) with a hairline border and no ring around the photo; the
//   whole card is one link with a "View" button.
export default function ProductTile({
  href,
  name,
  imageUrl,
  placeholderClass,
  priceLabel,
  oldPriceLabel,
  badge,
  note,
  eyebrow,
  description,
  cta,
  actions,
  textured = false,
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
  eyebrow?: string;
  description?: string | null;
  cta?: string;
  actions?: React.ReactNode;
  textured?: boolean;
}) {
  // always a circle: a square box (aspect-square) that cannot be squeezed, with the
  // photo cropped to fill it
  const photo = (
    <div
      className={`mx-auto shrink-0 ${
        actions ? "w-[84%] lg:w-[82%]" : "w-[calc(100%-12px)]"
      }`}
    >
      <div
        className={`relative aspect-square shrink-0 overflow-hidden rounded-full ${
          actions
            ? "" // product cards: just the photo, no ring, no shadow, no frame
            : textured
              ? "shadow-[0_4px_14px_rgba(60,40,25,0.16)]"
              : "ring-1 ring-gold-600 ring-offset-[5px] ring-offset-paper"
        }`}
      >
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
  );

  const title = (
    <>
      {eyebrow && (
        <span className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-salamander-600 uppercase">
          {eyebrow}
        </span>
      )}
      <h3
        className={`font-display leading-tight text-taupe-800 ${
          actions ? "text-[11px] sm:text-sm" : "text-base sm:text-xl"
        }`}
      >
        {name}
      </h3>
      {description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-taupe-600 sm:mt-2 sm:text-sm">
          {description}
        </p>
      )}
    </>
  );

  const extras = (
    <>
      {badge && (
        <span
          className={`mt-1 rounded-full bg-salamander-500 font-semibold text-cream-50 ${
            actions ? "px-1.5 py-0.5 text-[9px] sm:text-[10px]" : "px-2 py-0.5 text-[11px]"
          }`}
        >
          {badge}
        </span>
      )}
      {note && (
        <span
          className={`mt-1 text-red-600 ${actions ? "text-[10px] sm:text-[11px]" : "text-xs"}`}
        >
          {note}
        </span>
      )}
    </>
  );

  const price = priceLabel && (
    <span
      className={`font-semibold text-salamander-600 ${
        actions ? "text-[10px] leading-tight sm:text-xs lg:text-left" : "text-sm sm:text-[15px]"
      }`}
    >
      {oldPriceLabel && (
        <span className="mr-1.5 font-normal text-taupe-400 line-through">
          {oldPriceLabel}
        </span>
      )}
      {priceLabel}
    </span>
  );

  if (actions) {
    return (
      <div className="group flex h-full flex-col rounded border border-cream-200 bg-paper px-1.5 pt-2.5 text-center shadow-[0_4px_12px_rgba(60,40,25,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_8px_18px_rgba(60,40,25,0.16)] sm:px-2.5 sm:pt-3.5">
        <Link href={href} className="flex flex-1 flex-col">
          {photo}
          <div className="flex flex-1 flex-col items-center justify-center px-0.5 pt-2 sm:pt-2.5">
            {title}
            {extras}
          </div>
        </Link>
        {/* stacked on phones and tablets; price and buttons side by side on wide screens */}
        <div className="mt-2 flex flex-col items-center gap-1.5 border-t border-cream-200 py-2 lg:flex-row lg:justify-between lg:py-2.5">
          {price}
          {actions}
        </div>
      </div>
    );
  }

  const content = (
    <>
      {photo}
      <div className="flex flex-1 flex-col items-center px-0.5 pt-3 sm:px-1 sm:pt-5">
        <div className="flex flex-1 flex-col items-center justify-center">
          {title}
          {priceLabel && (
            <span
              className="my-2.5 block h-px w-7 bg-gold-600"
              aria-hidden="true"
            />
          )}
          {price}
          {extras}
        </div>
        {cta && (
          // looks like a button, in the style of the top bar; the whole card is the
          // link (a real button inside a link would be invalid), so this is a span
          <span className="mt-3 mb-3.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-choc px-3.5 py-1.5 text-xs font-semibold text-cream-50 shadow-sm transition-colors group-hover:bg-gold-400 group-hover:text-choc sm:mb-5 sm:px-5 sm:py-2 sm:text-sm">
            {cta}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        )}
        {!cta && <div className="pb-3.5 sm:pb-5" />}
      </div>
    </>
  );

  if (textured) {
    return (
      <Link
        href={href}
        className="group flex h-full flex-col rounded border border-cream-300/70 bg-[url(/images/card-bg.jpg)] bg-cover bg-center px-2.5 pt-3.5 text-center sm:px-4 sm:pt-5 shadow-[0_8px_22px_rgba(60,40,25,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(60,40,25,0.16)]"
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded border border-cream-200 bg-paper px-2.5 pt-3.5 text-center sm:px-4 sm:pt-5 shadow-[0_8px_22px_rgba(60,40,25,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(60,40,25,0.16)]"
    >
      {content}
    </Link>
  );
}
