"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

// A subcategory on the homepage. The photo is one of its products, only an example,
// chosen at random at every visit (the page is cached for everyone, so the choice is
// made in the browser); a click opens the subcategory, not the product.
export default function SubcategoryCard({
  href,
  name,
  countLabel,
  cta,
  images,
  placeholderClass,
}: {
  href: string;
  name: string;
  countLabel: string;
  cta: string;
  images: string[];
  placeholderClass: string;
}) {
  const [image, setImage] = useState<string | null>(images[0] ?? null);
  useEffect(() => {
    if (images.length < 2) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImage(images[Math.floor(Math.random() * images.length)]);
  }, [images]);

  return (
    <Link
      href={href}
      className="group flex h-full flex-col items-center rounded-3xl border border-white/15 bg-choc/55 backdrop-blur-md text-cream-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(0,0,0,0.18)] px-3 pt-4 pb-4 text-center"
    >
      <span className="block h-28 w-28 shrink-0 overflow-hidden rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.28)] ring-2 ring-white/20 sm:h-32 sm:w-32">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            draggable={false}
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
      <span className="mt-3 font-display text-lg leading-tight text-cream-50 sm:text-xl">
        {name}
      </span>
      <span className="mt-0.5 mb-3 text-xs text-cream-100/90">{countLabel}</span>
      <span className="mt-auto inline-flex items-center gap-1.5 rounded-full bg-gold-400 font-semibold text-choc shadow-sm transition-colors group-hover:bg-gold-300 px-3.5 py-1.5 text-xs">
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
    </Link>
  );
}
