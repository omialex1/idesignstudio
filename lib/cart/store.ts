import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProductLine } from "@/lib/generated/prisma";

export type CartColorChoice = {
  componentId: string;
  componentName: string | null;
  colors: string[];
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
  line: ProductLine;
  nameSnapshot: string;
  priceCents: number;
  currency: string;
  quantity: number;
  imageUrl?: string | null;
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
              items: state.items.map((i) =>
                i.lineId === lineId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, lineId, quantity }] };
        }),
      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.lineId !== lineId),
        })),
      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.lineId !== lineId)
              : state.items.map((i) =>
                  i.lineId === lineId ? { ...i, quantity } : i,
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "idesignstudio-cart",
      // Older carts have a different colour format and cannot be checked out.
      version: 3,
      migrate: () => ({ items: [] }),
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
