import type { Metadata } from "next";
import FavoritesView from "@/components/shop/FavoritesView";

// A page of the visitor's own list: nothing to find through Google.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
