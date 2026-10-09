"use client";

import { useRef, useState } from "react";

// Native scroll-snap carousel: swipes on touch screens, arrow buttons and the
// keyboard arrows elsewhere, thumbnails below.
export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const many = images.length > 1;

  function goTo(index: number) {
    const el = track.current;
    if (!el) return;
    const target = (index + images.length) % images.length;
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
    setActive(target);
  }

  function handleScroll() {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(active - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(active + 1);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={track}
          onScroll={handleScroll}
          onKeyDown={many ? handleKeyDown : undefined}
          tabIndex={many ? 0 : undefined}
          aria-roledescription={many ? "carousel" : undefined}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((url, index) => (
            <div key={url} className="w-full shrink-0 snap-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={many ? `${alt} (${index + 1}/${images.length})` : alt}
                loading={index === 0 ? "eager" : "lazy"}
                draggable={false}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          ))}
        </div>

        {many && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => goTo(active - 1)}
              className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/90 text-taupe-800 shadow transition-colors hover:bg-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => goTo(active + 1)}
              className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/90 text-taupe-800 shadow transition-colors hover:bg-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-taupe-800/70 px-2.5 py-1 text-xs font-medium text-cream-50">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {many && (
        <div className="grid grid-cols-6 gap-2">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`${alt} ${index + 1}`}
              aria-current={index === active}
              className={`overflow-hidden rounded-lg border-2 ${
                index === active ? "border-salamander-500" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
