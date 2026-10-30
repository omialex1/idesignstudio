import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { sortTiers, tierFor, tierRanges, type PriceTier } from "@/lib/tiers";

export type CartColorChoice = {
  componentId: string;
  componentName: string | null;
  colors: string[];
  // names of the chosen colours, so custom colours show right in the cart
  labels?: Record<string, { ro: string; en: string }>;
};

export type CartItem = {
  // Same product with a different variant/colours is a separate cart line.
  lineId: string;
  productId: string;
  variantId?: string | null;
  variantName?: string | null;
  colorChoices: CartColorChoice[];
  colorNote?: string | null;
  slug: string;
  categorySlug: string;
  // Main category the product belongs to: used for its link and placeholder colour.
  mainSlug: string;
  colorKey: string;
  nameSnapshot: string;
  priceCents: number;
  // with a discount: the prior price (struck through) and the percentage against it
  fullPriceCents?: number | null;
  discountPercent?: number | null;
  discountLabel?: string | null;
  currency: string;
  quantity: number;
  imageUrl?: string | null;
  // Tiered products (e.g. invitations): the unit price follows the total
  // quantity of the product in the cart; priceCents and tierRange are kept up
  // to date by the store.
  tiers?: PriceTier[];
  tierRange?: { from: number; to: number | null };
};

export type NewCartItem = Omit<CartItem, "quantity" | "lineId">;

export function buildLineId(
  item: Pick<NewCartItem, "productId" | "variantId" | "colorChoices" | "colorNote">,
) {
  return [
    item.productId,
    item.variantId ?? "",
    item.colorChoices
      .map((c) => `${c.componentId}:${[...c.colors].sort().join("+")}`)
      .join(";"),
    (item.colorNote ?? "").trim().toLowerCase(),
  ].join("|");
}

// Re-prices tiered lines from the total quantity of their product.
function reprice(items: CartItem[]): CartItem[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.tiers?.length) {
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
    }
  }
  return items.map((item) => {
    if (!item.tiers?.length) return item;
    const total = totals.get(item.productId) ?? item.quantity;
    const tier = tierFor(item.tiers, total) ?? sortTiers(item.tiers)[0];
    const range = tierRanges(item.tiers).find(
      (r) => r.priceCents === tier.priceCents && total >= r.from && (r.to === null || total <= r.to),
    );
    return {
      ...item,
      priceCents: tier.priceCents,
      tierRange: range ? { from: range.from, to: range.to } : item.tierRange,
    };
  });
}

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (item: NewCartItem, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addItem: (item, quantity = 1) =>
        set((state) => {
          const lineId = buildLineId(item);
          const existing = state.items.find((i) => i.lineId === lineId);
          if (existing) {
            return {
              items: reprice(
                state.items.map((i) =>
                  i.lineId === lineId
                    ? { ...i, quantity: i.quantity + quantity }
                    : i,
                ),
              ),
            };
          }
          return {
            items: reprice([...state.items, { ...item, lineId, quantity }]),
          };
        }),
      removeItem: (lineId) =>
        set((state) => ({
          items: reprice(state.items.filter((i) => i.lineId !== lineId)),
        })),
      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items: reprice(
            quantity <= 0
              ? state.items.filter((i) => i.lineId !== lineId)
              : state.items.map((i) =>
                  i.lineId === lineId ? { ...i, quantity } : i,
                ),
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "idesignstudio-cart",
      // Older carts have a different shape (colour picks, category link) and cannot be checked out.
      version: 4,
      migrate: () => ({ items: [] }),
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
