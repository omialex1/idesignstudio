"use client";

import { useEffect, useState } from "react";
import EndlessRow from "@/components/layout/EndlessRow";
import StripCard, { type StripItem } from "@/components/product/StripCard";

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
          node: <StripCard item={item} />,
        }))}
      />
    </section>
  );
}
