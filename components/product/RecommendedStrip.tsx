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
  // the price on the photo (after the discount) and the one struck through
  price?: string;
  oldPrice?: string;
  // mixed into a new random order at every visit (the others keep their place)
  shuffle?: boolean;
};

// "Merge bine cu…": a row of small photos joined together, swiped (or moved with
// the arrows) left and right; a click opens the product.
export default function RecommendedStrip({
  title,
  items: given,
  prevLabel,
  nextLabel,
}: {
  title: string;
  items: StripItem[];
  prevLabel: string;
  nextLabel: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  // the page is the same for everyone (cached), so the mixing happens in the
  // browser once the page is shown; until then the saved order is used
  const [items, setItems] = useState(given);
  useEffect(() => {
    // only the products from a random-order group are mixed; the rest stay first
    const fixed = given.filter((i) => !i.shuffle);
    const mixed = given.filter((i) => i.shuffle);
    if (mixed.length < 2) return;
    for (let i = mixed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems([...fixed, ...mixed]);
  }, [given]);

  // whether the row is wider than its space (then the arrows show, at every screen
  // size), and whether it is at its start or its end (the arrow that cannot move
  // is dimmed); it follows the window being resized
  const [edges, setEdges] = useState({ overflow: false, atStart: true, atEnd: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const next = {
        overflow: el.scrollWidth > el.clientWidth + 1,
        atStart: el.scrollLeft <= 1,
        atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
      };
      setEdges((prev) =>
        prev.overflow === next.overflow &&
        prev.atStart === next.atStart &&
        prev.atEnd === next.atEnd
          ? prev
          : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    // measured again once the page has settled (fonts and photos can move things)
    const timers = [100, 600, 2000].map((ms) => setTimeout(measure, ms));
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", measure);
      observer.disconnect();
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  function move(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow =
    "absolute top-[36%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cream-300 bg-white/95 text-lg leading-none text-taupe-800 shadow-md transition-colors hover:bg-cream-100 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/95 sm:h-9 sm:w-9";

  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold tracking-wide text-taupe-600 uppercase">
        {title}
      </h2>
      <div className="relative">
        <ul
          ref={track}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <li key={item.id} className="shrink-0 snap-start">
              <Link
                href={item.href}
                title={item.name}
                aria-label={item.name}
                className="group relative block h-[115px] w-[115px] overflow-hidden rounded-xl sm:h-[134px] sm:w-[134px]"
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
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-choc/80 px-2 py-0.5 text-[10px] font-medium text-cream-50">
                    {item.note}
                  </span>
                )}
                {/* name and price always on the photo (a phone has no hover) */}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-choc/90 via-choc/65 to-transparent px-1.5 pt-7 pb-1.5 text-cream-50">
                  <span className="line-clamp-2 text-[11px] leading-tight font-medium sm:text-xs">
                    {item.name}
                  </span>
                  {item.price && (
                    <span className="text-[11px] font-semibold sm:text-xs">
                      {item.oldPrice && (
                        <span className="mr-1 font-normal line-through opacity-70">
                          {item.oldPrice}
                        </span>
                      )}
                      {item.price}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {edges.overflow && (
          <>
            <button
              type="button"
              aria-label={prevLabel}
              disabled={edges.atStart}
              onClick={() => move(-1)}
              className={`${arrow} left-1.5`}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={nextLabel}
              disabled={edges.atEnd}
              onClick={() => move(1)}
              className={`${arrow} right-1.5`}
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
