"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

export type StripItem = {
  id: string;
  href: string;
  name: string;
  imageUrl: string | null;
  // background of the placeholder when there is no photo
  placeholderClass: string;
  // shown on the photo when the product is out of stock
  note?: string;
};

// "Merge bine cu…": a row of small photos joined together, swiped (or moved with
// the arrows) left and right; a click opens the product.
export default function RecommendedStrip({
  title,
  items: given,
  shuffle = false,
  prevLabel,
  nextLabel,
}: {
  title: string;
  items: StripItem[];
  // a new random order at every visit
  shuffle?: boolean;
  prevLabel: string;
  nextLabel: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  // the page is the same for everyone (cached), so the mixing happens in the
  // browser once the page is shown; until then the saved order is used
  const [items, setItems] = useState(given);
  useEffect(() => {
    if (!shuffle) return;
    const mixed = [...given];
    for (let i = mixed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(mixed);
  }, [given, shuffle]);

  function move(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow =
    "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cream-300 bg-white/95 text-taupe-800 shadow-md transition-colors hover:bg-cream-100 sm:flex";

  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold tracking-wide text-taupe-600 uppercase">
        {title}
      </h2>
      <div className="relative">
        <ul
          ref={track}
          className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-xl bg-cream-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <li key={item.id} className="shrink-0 snap-start">
              <Link
                href={item.href}
                title={item.name}
                aria-label={item.name}
                className="group relative block h-24 w-24 overflow-hidden sm:h-28 sm:w-28"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span
                    className={`flex h-full w-full items-center justify-center font-display text-2xl ${item.placeholderClass}`}
                  >
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                )}
                {item.note && (
                  <span className="absolute inset-x-0 bottom-0 bg-choc/75 px-1 py-0.5 text-center text-[10px] font-medium text-cream-50">
                    {item.note}
                  </span>
                )}
                <span className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-choc/70 via-transparent to-transparent p-1.5 text-[11px] leading-tight font-medium text-cream-50 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="line-clamp-2">{item.name}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {items.length > 4 && (
          <>
            <button
              type="button"
              aria-label={prevLabel}
              onClick={() => move(-1)}
              className={`${arrow} left-2`}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={nextLabel}
              onClick={() => move(1)}
              className={`${arrow} right-2`}
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
