import { Link } from "@/i18n/navigation";

// Product names carry the search keywords after a dash ("MORRA – cu drenaj și
// farfurie"); on cards only the part before the dash is shown.
export function shortName(name: string) {
  return name.split(" – ")[0];
}

// Card with a round photo in a fine gold ring, the name and the price inside.
// Used for products on the homepage and in category lists, and for
// categories. Category cards pass `textured`: a soft blurred photo background
// (a portion of the hero backdrop) with a hairline border and no ring around
// the photo.
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
  textured?: boolean;
}) {
  const content = (
    <>
      <div className="mx-auto w-[calc(100%-12px)]">
        <div
          className={`relative aspect-square overflow-hidden rounded-full ${
            textured
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

      <div className="flex flex-1 flex-col items-center justify-center px-0.5 pt-3 pb-3.5 sm:px-1 sm:pt-5 sm:pb-5">
        {eyebrow && (
          <span className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-salamander-600 uppercase">
            {eyebrow}
          </span>
        )}
        <h3 className="font-display text-base leading-tight text-taupe-800 sm:text-xl">
          {name}
        </h3>
        {description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-taupe-600 sm:mt-2 sm:text-sm">
            {description}
          </p>
        )}
        {(priceLabel || cta) && (
          <span
            className="my-2.5 block h-px w-7 bg-gold-600"
            aria-hidden="true"
          />
        )}
        {priceLabel && (
          <span className="text-xs font-semibold text-salamander-600 sm:text-sm">
            {oldPriceLabel && (
              <span className="mr-1.5 font-normal text-taupe-400 line-through">
                {oldPriceLabel}
              </span>
            )}
            {priceLabel}
          </span>
        )}
        {badge && (
          <span className="mt-1 rounded-full bg-salamander-500 px-2 py-0.5 text-[11px] font-semibold text-cream-50">
            {badge}
          </span>
        )}
        {cta && (
          <span className="text-xs font-medium text-salamander-600 group-hover:underline sm:text-sm">
            {cta}
          </span>
        )}
        {note && <span className="mt-1 text-xs text-red-600">{note}</span>}
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
