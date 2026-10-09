"use client";

import { useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 50;
const DRAG_CLICK_TOLERANCE_PX = 5;
// Zoom steps in the lightbox: fit to screen (100%) up to 150%.
const ZOOM_STEPS = [1, 1.25, 1.5];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

// Native scroll-snap carousel (swipe on touch screens, arrow buttons and the
// keyboard arrows elsewhere, thumbnails below). Clicking a photo opens it
// large in a lightbox with previous / next / close controls and zoom up to
// 150%.
export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const panArea = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);
  // width / height of the photo shown in the lightbox
  const [ratio, setRatio] = useState(0.75);
  const many = images.length > 1;
  const zoomed = zoom > 1;

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

  function openLightbox(index: number) {
    setActive(index);
    setZoom(1);
    setLightbox(true);
  }

  function closeLightbox() {
    setZoom(1);
    setLightbox(false);
  }

  function showInLightbox(index: number) {
    setActive(wrap(index));
    setZoom(1);
  }

  function zoomBy(direction: 1 | -1) {
    const current = ZOOM_STEPS.findIndex((z) => z >= zoom);
    const next = Math.min(
      ZOOM_STEPS.length - 1,
      Math.max(0, (current === -1 ? 0 : current) + direction),
    );
    setZoom(ZOOM_STEPS[next]);
  }

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setZoom(1);
        setLightbox(false);
      } else if (e.key === "ArrowLeft") {
        setActive((i) => (i - 1 + images.length) % images.length);
        setZoom(1);
      } else if (e.key === "ArrowRight") {
        setActive((i) => (i + 1) % images.length);
        setZoom(1);
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(MAX_ZOOM, z + 0.25));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(1, z - 0.25));
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

  // Bring the carousel behind the lightbox to the photo last viewed.
  useEffect(() => {
    if (lightbox) return;
    const el = track.current;
    if (el && el.clientWidth > 0) {
      el.scrollTo({ left: active * el.clientWidth, behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  // Keep a zoomed photo centred when the zoom level or photo changes.
  useEffect(() => {
    const el = panArea.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
  }, [zoom, active, lightbox, ratio]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || !many || zoomed) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    showInLightbox(delta < 0 ? active + 1 : active - 1);
  }

  // Mouse drag pans a zoomed photo (touch screens pan by scrolling natively).
  function onPointerDown(e: React.PointerEvent) {
    const el = panArea.current;
    if (!el || !zoomed || e.pointerType !== "mouse") return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const el = panArea.current;
    const d = drag.current;
    if (!el || !d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > DRAG_CLICK_TOLERANCE_PX) d.moved = true;
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
  }

  function onPointerUp() {
    // keep `moved` until the click event that follows has been handled
    setTimeout(() => {
      drag.current = null;
    }, 50);
  }

  function onPhotoClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (drag.current?.moved) return;
    setZoom(zoomed ? 1 : MAX_ZOOM);
  }

  const arrowClass =
    "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/90 text-taupe-800 shadow transition-colors hover:bg-white";
  const roundButton =
    "flex h-10 w-10 items-center justify-center rounded-full text-taupe-800 transition-colors hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent";

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
              onClick={() => openLightbox(index)}
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
          {/* 80% of the screen; a zoomed photo scrolls / drags inside it */}
          <div
            ref={panArea}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className={`flex max-h-[80vh] max-w-[80vw] items-start overflow-auto rounded-lg shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={images[active]}
              src={images[active]}
              alt={many ? `${alt} (${active + 1}/${images.length})` : alt}
              draggable={false}
              onClick={onPhotoClick}
              onLoad={(e) =>
                setRatio(
                  e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
                )
              }
              style={{
                // fits the 80% box at 100%, grows with the zoom level
                width: `calc(min(80vw, 80vh * ${ratio}) * ${zoom})`,
                maxWidth: "none",
                flexShrink: 0,
              }}
              className="block h-auto object-contain"
            />
          </div>

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

          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-5 left-4 flex items-center rounded-full bg-cream-50/90 shadow"
          >
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom <= 1}
              onClick={() => zoomBy(-1)}
              className={roundButton}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
              </svg>
            </button>
            <span className="min-w-12 text-center text-sm font-medium text-taupe-800">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => zoomBy(1)}
              className={roundButton}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {many && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  showInLightbox(active - 1);
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
                  showInLightbox(active + 1);
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
