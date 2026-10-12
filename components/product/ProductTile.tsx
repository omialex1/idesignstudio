import { Link } from "@/i18n/navigation";

// Product names carry the search keywords after a dash ("MORRA – cu drenaj și
// farfurie"); on cards only the part before the dash is shown.
export function shortName(name: string) {
  return name.split(" – ")[0];
}

// Warm paper card with a round photo in a fine gold ring, the name and the
// price inside. Used for products on the homepage and in category lists, and
// (with `meta` set) for subcategories.
export default function ProductTile({
  href,
  name,
  imageUrl,
  placeholderClass,
  priceLabel,
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
  note?: string;
  eyebrow?: string;
  description?: string | null;
  cta?: string;
  // soft blurred photo background (a portion of the hero backdrop) instead of plain paper
  textured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col rounded border border-cream-200 px-4 pt-5 text-center shadow-[0_8px_22px_rgba(60,40,25,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(60,40,25,0.16)] ${
        textured ? "bg-[url(/images/card-bg.jpg)] bg-cover bg-center" : "bg-paper"
      }`}
    >
      <div className="mx-auto w-[calc(100%-12px)]">
        <div
          className={`relative aspect-square overflow-hidden rounded-full ring-1 ring-gold-600 ring-offset-[5px] ${
            textured ? "ring-offset-transparent" : "ring-offset-paper"
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

      <div className="flex flex-1 flex-col items-center justify-center px-1 pt-5 pb-5">
        {eyebrow && (
          <span className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-salamander-600 uppercase">
            {eyebrow}
          </span>
        )}
        <h3 className="font-display text-xl leading-tight text-taupe-800">
          {name}
        </h3>
        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-taupe-600">
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
          <span className="text-sm font-semibold text-salamander-600">
            {priceLabel}
          </span>
        )}
        {cta && (
          <span className="text-sm font-medium text-salamander-600 group-hover:underline">
            {cta}
          </span>
        )}
        {note && <span className="mt-1 text-xs text-red-600">{note}</span>}
      </div>
    </Link>
  );
}
