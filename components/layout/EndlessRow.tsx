"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// How many times the list may be repeated at the end of the row (it never really
// ends: when the visitor gets close to the end, the same list is added again).
const MAX_COPIES = 12;

export type EndlessItem = { key: string; node: ReactNode };

// A row of cards that is swiped (or moved with the arrows) left and right. When the
// row is longer than its space it repeats itself endlessly to the right; when it all
// fits, there are no arrows and no repeating. Both ends fade out softly, so nothing
// looks cut. On wide screens the arrows sit outside the row.
export default function EndlessRow({
  items,
  resetKey,
  prevLabel,
  nextLabel,
  itemClassName,
  trackClassName = "pt-9 pb-10 -mt-5 -mb-6",
  arrowClassName = "top-[88px]",
  centered = false,
}: {
  items: EndlessItem[];
  // changes whenever the order of the items changes: the row then goes back to its start
  resetKey: string;
  prevLabel: string;
  nextLabel: string;
  // the width of one item (the `li`), e.g. "w-[141px] shrink-0"
  itemClassName: string;
  // vertical room around the cards (for their shadows and glow)
  trackClassName?: string;
  // where the arrows sit from the top of the row, e.g. "top-[88px]"
  arrowClassName?: string;
  // a row that fits in its space sits in the middle instead of at the left
  centered?: boolean;
}) {
  const track = useRef<HTMLUListElement>(null);

  // Moving the cards around in the page makes the browser (scroll snap) follow the
  // card it had snapped to, so the row could start somewhere in the middle. After
  // every re-ordering the row goes back to its start.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollLeft = 0;
    const frame = requestAnimationFrame(() => {
      el.scrollLeft = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [resetKey]);

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
  }, [resetKey, copies]);

  function move(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow = `absolute z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cream-300 bg-white/95 text-lg leading-none text-taupe-800 shadow-md transition-colors hover:bg-cream-100 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/95 sm:h-9 sm:w-9 ${arrowClassName}`;

  return (
    <div className="relative">
      <ul
        ref={track}
        className={`flex snap-x snap-mandatory scroll-px-8 gap-3 overflow-x-auto overflow-y-hidden px-8 -mx-6 [mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%-28px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${trackClassName} ${
          centered ? "[&>li:first-child]:ml-auto [&>li:last-child]:mr-auto" : ""
        }`}
      >
        {Array.from({ length: copies }, (_, copy) =>
          items.map((item) => ({ item, copy })),
        )
          .flat()
          .map(({ item, copy }) => (
            <li
              key={`${item.key}-${copy}`}
              className={`snap-start ${itemClassName}`}
            >
              {item.node}
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
  );
}
