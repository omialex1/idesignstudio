import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// The products a visitor marked with the heart. Kept in the browser (no account
// needed); only the ids are stored, the page asks the server for the current
// name, photo and price of each.
type FavoritesState = {
  ids: string[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      toggle: (productId) =>
        set((state) => ({
          ids: state.ids.includes(productId)
            ? state.ids.filter((id) => id !== productId)
            : [productId, ...state.ids],
        })),
      remove: (productId) =>
        set((state) => ({ ids: state.ids.filter((id) => id !== productId) })),
    }),
    {
      name: "idesignstudio-favorites",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ ids: state.ids }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
