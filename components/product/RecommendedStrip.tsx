"use client";

import { useEffect, useState } from "react";
import EndlessRow from "@/components/layout/EndlessRow";
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

// "Merge bine cu…": a row of small photos above small cards, swiped (or moved with the
// arrows) left and right; a click opens the product. The row repeats itself endlessly
// when it is longer than its space (see EndlessRow).
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

  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold tracking-wide text-taupe-600 uppercase">
        {title}
      </h2>
      <EndlessRow
        resetKey={items.map((i) => i.id).join(",")}
        prevLabel={prevLabel}
        nextLabel={nextLabel}
        itemClassName="w-[125px] shrink-0 sm:w-[141px]"
        items={items.map((item) => ({
          key: item.id,
          node: (
            <>
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
            </>
          ),
        }))}
      />
    </section>
  );
}
