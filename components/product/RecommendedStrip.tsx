"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import ProductActions from "@/components/product/ProductActions";
import type { CardProduct } from "@/lib/product-card";

export type StripItem = {
  id: string;
  href: string;
  name: string;
  imageUrl: string | null;
  // background of the placeholder when there is no photo
  placeholderClass: string;
  // shown on the card when the product is out of stock
  note?: string;
  // the price (after the discount) and the one struck through, and the discount tag
  price?: string;
  oldPrice?: string;
  badge?: string;
  // what the heart and cart buttons need
  card: CardProduct;
  // mixed into a new random order at every visit (the others keep their place)
  shuffle?: boolean;
};

// How many times the list may be repeated at the end of the row (it never really
// ends: when the visitor gets close to the end, the same list is added again).
const MAX_COPIES = 12;

// "Merge bine cu…": a row of small photos joined together, swiped (or moved with
// the arrows) left and right; a click opens the product. When the row is longer
// than its space it repeats itself endlessly to the right.
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

  // Mixing the products moves the cards in the page, and the browser (scroll snap)
  // follows the card it had snapped to, so the row could start somewhere in the
  // middle. After every re-ordering the row goes back to its start.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollLeft = 0;
    const frame = requestAnimationFrame(() => {
      el.scrollLeft = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [items]);

  // how many times the list is shown one after the other
  const [copies, setCopies] = useState(1);

  // whether the row is wider than its space (then the arrows show, at every screen
  // size), and whether it is at its start or its end (the arrow that cannot move
  // is dimmed); it follows the window being resized. Close to the end, the list is
  // added once more, so the row keeps going.
  const [edges, setEdges] = useState({
    overflow: false,
    atStart: true,
    atEnd: false,
  });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      // the width of one copy of the list
      const oneList = el.scrollWidth / copies;
      const overflow = oneList > el.clientWidth + 1;
      if (!overflow && copies > 1) {
        setCopies(1);
      } else if (
        overflow &&
        copies < MAX_COPIES &&
        el.scrollLeft + el.clientWidth > el.scrollWidth - el.clientWidth * 1.5
      ) {
        setCopies((c) => Math.min(c + 1, MAX_COPIES));
      }
      const next = {
        overflow,
        atStart: el.scrollLeft <= 1,
        atEnd:
          copies >= MAX_COPIES &&
          el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
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
  }, [items, copies]);

  function move(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow =
    "absolute top-[88px] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cream-300 bg-white/95 text-lg leading-none text-taupe-800 shadow-md transition-colors hover:bg-cream-100 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/95 sm:h-9 sm:w-9";

  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold tracking-wide text-taupe-600 uppercase">
        {title}
      </h2>
      <div className="relative">
        <ul
          ref={track}
          className="flex snap-x snap-mandatory scroll-px-8 gap-3 overflow-x-auto overflow-y-hidden px-8 pt-9 pb-10 -mx-6 -mt-5 -mb-6 [mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%-28px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {Array.from({ length: copies }, (_, copy) =>
            items.map((item) => ({ item, copy })),
          )
            .flat()
            .map(({ item, copy }) => (
              <li
                key={`${item.id}-${copy}`}
                className="w-[125px] shrink-0 snap-start sm:w-[141px]"
              >
                {/* the photo hangs above its card, on its own: no frame, a few pixels
                  of air, and a soft glow so it does not look stuck to the page */}
                <div className="group flex h-full flex-col items-center">
                  <Link
                    href={item.href}
                    aria-label={item.name}
                    className="block shrink-0 rounded-full"
                  >
                    <span className="block h-[108px] w-[108px] overflow-hidden rounded-full shadow-[0_8px_18px_-2px_rgba(60,40,25,0.28),0_0_18px_3px_rgba(210,168,104,0.28)] transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-[120px] sm:w-[120px]">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          draggable={false}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span
                          className={`flex h-full w-full items-center justify-center font-display text-3xl ${item.placeholderClass}`}
                        >
                          {item.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                  </Link>

                  <div className="mt-3.5 flex w-full flex-1 flex-col items-center rounded border border-cream-200 bg-paper px-1.5 pt-2 pb-2.5 text-center shadow-[0_3px_10px_rgba(60,40,25,0.10)]">
                    <Link
                      href={item.href}
                      className="flex flex-1 flex-col items-center"
                    >
                      <h3 className="line-clamp-3 font-display text-[12px] leading-tight text-taupe-800 sm:text-[13px]">
                        {item.name}
                      </h3>
                      {item.badge && (
                        <span className="mt-1 rounded-full bg-salamander-500 px-1.5 py-0.5 text-[9px] font-semibold text-cream-50">
                          {item.badge}
                        </span>
                      )}
                      {item.note && (
                        <span className="mt-1 text-[10px] text-red-600">
                          {item.note}
                        </span>
                      )}
                    </Link>
                    {item.price && (
                      <span className="mt-1.5 text-[11px] font-semibold text-salamander-600 sm:text-xs">
                        {item.oldPrice && (
                          <span className="mr-1 font-normal text-taupe-400 line-through">
                            {item.oldPrice}
                          </span>
                        )}
                        {item.price}
                      </span>
                    )}
                    <div className="mt-1.5 border-t border-cream-200 pt-2">
                      <ProductActions product={item.card} compact />
                    </div>
                  </div>
                </div>
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
              className={`${arrow} -left-2 lg:-left-12`}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={nextLabel}
              disabled={edges.atEnd}
              onClick={() => move(1)}
              className={`${arrow} -right-2 lg:-right-12`}
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
