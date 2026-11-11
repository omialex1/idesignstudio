"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

// Whether the first page of this visit was already counted. Kept only in memory (it is
// gone when the page is reloaded), so nothing at all is stored on the visitor's device.
let visitStarted = false;

// Tells the visitor counter that a page was opened. It sends the page and, on the
// first page of a visit, where the visitor came from. No cookies and nothing stored on
// the visitor's device. "Do Not Track" is respected, and nothing is sent while
// developing.
export default function TrafficBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (navigator.doNotTrack === "1") return;
    const first = !visitStarted;
    visitStarted = true;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        ref: first ? document.referrer : "",
        first,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
