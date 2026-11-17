import { Link } from "@/i18n/navigation";
import ProductPhoto from "@/components/product/ProductPhoto";

// A main category on the homepage: a big square photo flush to the left edge of the card
// (on a phone, on top), and next to it the text. Every card has the same look, so they
// match side by side (the first one may sit in a taller cell; the photo then grows).
//
// The text has its own area that grows and shrinks (a longer name takes more lines);
// the button stays pinned to the bottom and never moves because of the text.
export default function CategoryFeatureCard({
  href,
  name,
  imageUrl,
  placeholderClass,
  countLabel,
  cta,
}: {
  href: string;
  name: string;
  imageUrl: string | null;
  placeholderClass: string;
  countLabel: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gold-600/50 bg-paper/55 text-taupe-800 shadow-[0_8px_30px_rgba(60,40,25,0.12)] backdrop-blur-xl backdrop-saturate-150 transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(60,40,25,0.18)] sm:flex-row"
    >
      <span className="relative block aspect-square w-full shrink-0 overflow-hidden sm:w-[44%]">
        {imageUrl ? (
          <ProductPhoto
            src={imageUrl}
            alt=""
            sizes="(min-width: 640px) 290px, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center font-display text-5xl ${placeholderClass}`}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col items-center px-3 pt-3 pb-4 text-center sm:px-6 sm:pt-6 sm:pb-7">
        {/* the text area: grows and shrinks with the text */}
        <span className="flex flex-1 flex-col items-center justify-center gap-0.5 sm:gap-2">
          <span className="font-display text-xl leading-tight text-taupe-800 sm:text-3xl lg:text-4xl">
            {name}
          </span>
          <span className="text-xs text-taupe-600 sm:text-base">
            {countLabel}
          </span>
        </span>
        {/* the button: always at the bottom */}
        <span className="mt-3 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-choc px-3 py-1.5 text-xs font-semibold text-cream-50 shadow-sm transition-colors group-hover:bg-taupe-700 sm:mt-4 sm:px-6 sm:py-2.5 sm:text-sm">
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
      </span>
    </Link>
  );
}
