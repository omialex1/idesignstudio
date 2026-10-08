"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PENDING_ORDER_KEY,
  type PendingOrder,
} from "@/lib/cart/pending-order";

const POLL_INTERVAL_MS = 3000;
const POLL_DURATION_MS = 120000;
const STALE_AFTER_MS = 30 * 60 * 1000;

function readPendingOrder(): PendingOrder | null {
  try {
    const raw = localStorage.getItem(PENDING_ORDER_KEY);
    return raw ? (JSON.parse(raw) as PendingOrder) : null;
  } catch {
    return null;
  }
}

// If the customer comes back from the payment page to a different page than
// the "thank you" one (for example the cart), notice that the order was paid
// and send them to the confirmation page.
export default function PendingOrderWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.includes("/checkout/return")) return;

    const pending = readPendingOrder();
    if (!pending) return;
    if (Date.now() - pending.startedAt > STALE_AFTER_MS) {
      localStorage.removeItem(PENDING_ORDER_KEY);
      return;
    }

    let cancelled = false;
    const startedPolling = Date.now();

    async function check() {
      if (cancelled || !pending) return;
      try {
        const res = await fetch(`/api/orders/${pending.id}/status`, {
          cache: "no-store",
        });
        if (res.ok) {
          const { status } = await res.json();
          if (status === "PAID" || status === "COD") {
            router.replace(
              `/${pending.locale}/checkout/return?order=${pending.id}`,
            );
            return;
          }
          if (status === "FAILED" || status === "CANCELED") {
            localStorage.removeItem(PENDING_ORDER_KEY);
            return;
          }
        }
      } catch {
        // try again on the next tick
      }
      if (!cancelled && Date.now() - startedPolling < POLL_DURATION_MS) {
        setTimeout(check, POLL_INTERVAL_MS);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
