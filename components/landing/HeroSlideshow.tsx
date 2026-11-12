"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export type SlideData = {
  src: string;
  title: string;
  href: string;
  focus?: string;
};

const SECONDS = 5;

// The homepage hero: photos one after another, each for 5 seconds, in a rounded
// frame with the gold-to-terracotta edge. The title of the product is big and
// centered on the photo, and a click on the photo opens its page. Under the frame
// there is one dot per photo (the one shown is bigger and gold); two quiet arrows
// move to the previous and the next one. It stops while the mouse is over it or a
// button has the focus, and does not move by itself for visitors who asked their
// device for less motion. Photos are loaded one step ahead, not all at once.
export default function HeroSlideshow({
  slides,
  cta,
  label,
  prevLabel,
  nextLabel,
  dotLabels,
}: {
  slides: SlideData[];
  // small line under the title ("Vezi colecția")
  cta: string;
  label: string;
  prevLabel: string;
  nextLabel: string;
  // "Photo 1 of 8" … for every dot
  dotLabels: string[];
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  // the farthest photo reached: it and the next one are loaded
  const [reached, setReached] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = (to: number) => {
    const next = ((to % count) + count) % count;
    setIndex(next);
    setReached((r) => Math.max(r, next));
  };

  // the next photo comes after SECONDS; any move (arrow, dot, swipe) starts the count again
  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % count);
      setReached((r) => Math.max(r, Math.min(index + 1, count - 1)));
    }, SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [index, paused, count]);

  const arrow =
    "absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-choc/20 text-cream-50 backdrop-blur-sm transition-colors hover:bg-choc/45 focus-visible:bg-choc/45 sm:h-10 sm:w-10";

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* gold-to-terracotta frame, rounded */}
      <div className="rounded-[1.75rem] bg-gradient-to-br from-gold-300 via-gold-400 to-salamander-400 p-[3px] shadow-[0_6px_18px_rgba(60,40,25,0.16)]">
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-[calc(1.75rem-3px)] bg-choc sm:aspect-[16/9]"
          onTouchStart={(e) => {
            touchX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchX.current;
            touchX.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (start === null || end === undefined) return;
            if (Math.abs(end - start) > 40) go(index + (end < start ? 1 : -1));
          }}
        >
          {slides.map((slide, i) => {
            const active = i === index;
            const mounted = i <= Math.min(reached + 1, count - 1) || active;
            return (
              <div
                key={slide.src}
                aria-hidden={!active}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  active ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {mounted && (
                  <Image
                    src={slide.src}
                    alt=""
                    fill
                    priority={i === 0}
                    loading={i === 0 ? undefined : "eager"}
                    sizes="(min-width: 1024px) 976px, 100vw"
                    className="object-cover"
                    style={{ objectPosition: slide.focus ?? "50% 40%" }}
                  />
                )}
                <Link
                  href={slide.href}
                  tabIndex={active ? 0 : -1}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-end px-12 pb-6 text-center sm:px-20 sm:pb-9"
                >
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-choc/70 via-choc/25 to-transparent"
                    aria-hidden="true"
                  />
                  <span className="relative font-display text-2xl leading-tight text-cream-50 italic [text-shadow:0_2px_14px_rgba(0,0,0,0.45)] sm:text-5xl">
                    {slide.title}
                  </span>
                  <span className="relative mt-1.5 text-[10px] tracking-[0.22em] text-cream-100/85 uppercase sm:mt-2.5 sm:text-[11px]">
                    {cta}
                  </span>
                </Link>
              </div>
            );
          })}

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label={prevLabel}
                onClick={() => go(index - 1)}
                className={`${arrow} left-2.5 sm:left-4`}
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                aria-label={nextLabel}
                onClick={() => go(index + 1)}
                className={`${arrow} right-2.5 sm:right-4`}
              >
                <Chevron direction="right" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* one dot per photo; the one shown is bigger and gold */}
      {count > 1 && (
        <div className="mt-3.5 flex items-center justify-center sm:mt-4">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              aria-label={dotLabels[i]}
              aria-current={i === index}
              onClick={() => go(i)}
              className="flex h-5 w-5 items-center justify-center"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  i === index
                    ? "h-3 w-3 bg-gold-600"
                    : "h-2 w-2 bg-taupe-400/45 hover:bg-taupe-400"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M14.5 6l-6 6 6 6" : "M9.5 6l6 6-6 6"} />
    </svg>
  );
}
