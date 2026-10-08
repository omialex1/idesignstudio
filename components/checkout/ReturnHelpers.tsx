"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";

export function ClearCartOnMount() {
  const clear = useCartStore((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}

const REFRESH_INTERVAL_MS = 3000;
const MAX_REFRESHES = 40;

export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= MAX_REFRESHES) clearInterval(timer);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
