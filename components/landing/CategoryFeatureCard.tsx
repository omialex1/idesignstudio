import { Link } from "@/i18n/navigation";
import ProductPhoto from "@/components/product/ProductPhoto";

// A main category on the homepage. All of them have the same photo size, text size
// and button, so they look alike side by side (the first one may be a taller cell).
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
  const photo = (
    <span
      className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-full shadow-[0_4px_14px_rgba(60,40,25,0.22)] ring-2 ring-white/70 sm:h-[112px] sm:w-[112px]"
    >
      {imageUrl ? (
        <ProductPhoto
          src={imageUrl}
          alt=""
          sizes="112px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center font-display text-3xl ${placeholderClass}`}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );

  return (
    <Link
      href={href}
      className={`group flex h-full items-center rounded-3xl border border-gold-600/50 bg-paper/55 text-taupe-800 shadow-[0_8px_30px_rgba(60,40,25,0.12)] backdrop-blur-xl backdrop-saturate-150 transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(60,40,25,0.18)] flex-col gap-2.5 p-3 text-center sm:flex-row sm:gap-5 sm:p-5 sm:text-left`}
    >
      {photo}
      <span className="flex min-w-0 flex-col items-center sm:items-start">
        <span
          className="font-display text-base leading-tight text-taupe-800 sm:text-xl"
        >
          {name}
        </span>
        <span
          className="mt-0.5 text-xs text-taupe-600 sm:text-sm"
        >
          {countLabel}
        </span>
        <span
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-choc px-3 py-1.5 text-xs font-semibold text-cream-50 shadow-sm transition-colors group-hover:bg-taupe-700 sm:px-4 sm:text-sm"
        >
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
