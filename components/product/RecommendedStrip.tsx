"use client";

import { useEffect, useRef, useState } from "react";
import ProductTile from "@/components/product/ProductTile";
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
    "absolute top-[28%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cream-300 bg-white/95 text-lg leading-none text-taupe-800 shadow-md transition-colors hover:bg-cream-100 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/95 sm:h-9 sm:w-9";

  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold tracking-wide text-taupe-600 uppercase">
        {title}
      </h2>
      <div className="relative">
        <ul
          ref={track}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden px-1 pt-2 pb-9 -mb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <li
              key={item.id}
              className="w-[172px] shrink-0 snap-start sm:w-[196px]"
            >
              <ProductTile
                compact
                href={item.href}
                name={item.name}
                imageUrl={item.imageUrl}
                placeholderClass={item.placeholderClass}
                priceLabel={item.price}
                oldPriceLabel={item.oldPrice}
                badge={item.badge}
                note={item.note}
                actions={<ProductActions product={item.card} compact />}
              />
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
              className={`${arrow} -left-2`}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={nextLabel}
              disabled={edges.atEnd}
              onClick={() => move(1)}
              className={`${arrow} -right-2`}
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
