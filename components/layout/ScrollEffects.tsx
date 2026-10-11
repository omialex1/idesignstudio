"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Gentle scroll effect: elements marked with data-reveal fade and rise into
// place the first time they enter the screen. Everything is visible without
// JavaScript and is skipped for visitors who ask for reduced motion.
export default function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    ).filter((el) => !el.classList.contains("reveal-in"));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // also reveal what was scrolled past in one jump (anchor links, fast
          // scrolling), so it is not left invisible when scrolling back up
          const passed = entry.boundingClientRect.top < 0;
          if (!entry.isIntersecting && !passed) continue;
          entry.target.classList.add("reveal-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    for (const el of targets) {
      // what is already on screen stays put; only what is below the fold waits
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.classList.add("reveal-in");
        continue;
      }
      el.classList.add("reveal-init");
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
