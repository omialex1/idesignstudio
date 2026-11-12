import { Link } from "@/i18n/navigation";

// A main category on the homepage. The biggest one (`large`) is the wide card with
// a big round photo; the others are small. Same look as the other category cards: a
// soft textured background, a round photo with a soft shadow, a dark "view" button.
export default function CategoryFeatureCard({
  href,
  name,
  imageUrl,
  placeholderClass,
  countLabel,
  cta,
  large = false,
}: {
  href: string;
  name: string;
  imageUrl: string | null;
  placeholderClass: string;
  countLabel: string;
  cta: string;
  large?: boolean;
}) {
  const photo = (
    <span
      className={`block shrink-0 overflow-hidden rounded-full shadow-[0_4px_14px_rgba(60,40,25,0.16)] ${
        large
          ? "h-28 w-28 sm:h-32 sm:w-32"
          : "h-20 w-20 sm:h-[104px] sm:w-[104px]"
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
      className={`group flex h-full items-center rounded-2xl border border-cream-300/70 bg-[url(/images/card-bg.jpg)] bg-cover bg-center shadow-[0_8px_22px_rgba(60,40,25,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(60,40,25,0.16)] ${
        large
          ? "flex-col gap-3 p-4 text-center sm:flex-row sm:gap-5 sm:p-5 sm:text-left"
          : "flex-col gap-2.5 p-3 text-center sm:flex-row sm:gap-5 sm:p-5 sm:text-left"
      }`}
    >
      {photo}
      <span className="flex min-w-0 flex-col items-center sm:items-start">
        <span
          className={`font-display leading-tight text-taupe-800 ${
            large ? "text-xl sm:text-2xl" : "text-base sm:text-xl"
          }`}
        >
          {name}
        </span>
        <span
          className={`text-taupe-600 ${large ? "mt-1 text-sm" : "mt-0.5 text-xs sm:text-sm"}`}
        >
          {countLabel}
        </span>
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-choc font-semibold text-cream-50 shadow-sm transition-colors group-hover:bg-gold-400 group-hover:text-choc ${
            large
              ? "px-5 py-2 text-sm"
              : "px-3 py-1.5 text-xs sm:px-4 sm:text-sm"
          }`}
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
