"use client";

import { useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 50;

// Native scroll-snap carousel (swipe on touch screens, arrow buttons and the
// keyboard arrows elsewhere, thumbnails below). Clicking a photo opens it
// large in a lightbox with its own previous / next / close controls.
export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const many = images.length > 1;

  function wrap(index: number) {
    return (index + images.length) % images.length;
  }

  function goTo(index: number) {
    const el = track.current;
    if (!el) return;
    const target = wrap(index);
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

  function closeLightbox() {
    setLightbox(false);
    // Bring the carousel behind it to the photo last viewed.
    const el = track.current;
    if (el) el.scrollTo({ left: active * el.clientWidth, behavior: "auto" });
  }

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightbox(false);
      } else if (e.key === "ArrowLeft") {
        setActive((i) => (i - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight") {
        setActive((i) => (i + 1) % images.length);
      }
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightbox, images.length]);

  // Re-sync the carousel when the lightbox closes (also on Escape).
  useEffect(() => {
    if (lightbox) return;
    const el = track.current;
    if (el && el.clientWidth > 0) {
      el.scrollTo({ left: active * el.clientWidth, behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || !many) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    setActive((i) => wrap(delta < 0 ? i + 1 : i - 1));
  }

  const arrowClass =
    "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/90 text-taupe-800 shadow transition-colors hover:bg-white";

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
            <button
              key={url}
              type="button"
              onClick={() => {
                setActive(index);
                setLightbox(true);
              }}
              aria-label={`${alt} – enlarge`}
              className="block w-full shrink-0 cursor-zoom-in snap-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={many ? `${alt} (${index + 1}/${images.length})` : alt}
                loading={index === 0 ? "eager" : "lazy"}
                draggable={false}
                className="aspect-[4/5] w-full object-cover"
              />
            </button>
          ))}
        </div>

        {many && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => goTo(active - 1)}
              className={`${arrowClass} left-3`}
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => goTo(active + 1)}
              className={`${arrowClass} right-3`}
            >
              <Chevron direction="right" />
            </button>
            <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-taupe-800/70 px-2.5 py-1 text-xs font-medium text-cream-50">
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

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={closeLightbox}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-taupe-900/90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={many ? `${alt} (${active + 1}/${images.length})` : alt}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain shadow-2xl"
          />

          <button
            type="button"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-cream-50/90 text-taupe-800 shadow transition-colors hover:bg-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {many && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(wrap(active - 1));
                }}
                className={`${arrowClass} left-3 sm:left-6`}
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(wrap(active + 1));
                }}
                className={`${arrowClass} right-3 sm:right-6`}
              >
                <Chevron direction="right" />
              </button>
              <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-taupe-800/70 px-3 py-1 text-sm font-medium text-cream-50">
                {active + 1} / {images.length}
              </span>
            </>
          )}
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
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
