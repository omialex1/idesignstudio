"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ProductTile, { shortName } from "@/components/product/ProductTile";
import ProductActions from "@/components/product/ProductActions";
import { useFavoritesStore } from "@/lib/favorites/store";
import { formatPrice } from "@/lib/format";
import { categoryColorClass } from "@/lib/category-colors";
import type { FavoriteProduct } from "@/lib/db/products";

// The page of the products marked with the heart. The ids are in the browser; the
// server gives the current name, photo and price of each.
export default function FavoritesView() {
  const t = useTranslations("Favorites");
  const tShop = useTranslations("Shop");
  const locale = useLocale();
  const hydrated = useFavoritesStore((s) => s.hasHydrated);
  const ids = useFavoritesStore((s) => s.ids);
  const remove = useFavoritesStore((s) => s.remove);
  const [products, setProducts] = useState<FavoriteProduct[] | null>(null);
  // the ids the list was loaded for: a product removed here just disappears, it is
  // not asked for again
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hydrated || loaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, locale }),
    })
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]));
  }, [hydrated, loaded, ids, locale]);

  if (!hydrated || products === null) {
    return <div className="flex flex-1" />;
  }

  const shown = products.filter((p) => ids.includes(p.id));

  if (shown.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-3xl text-taupe-800">{t("title")}</h1>
        <p className="max-w-sm text-taupe-600">{t("empty")}</p>
        <Link
          href="/"
          className="text-sm font-medium text-salamander-600 hover:underline"
        >
          {t("browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="font-display text-3xl text-taupe-800">{t("title")}</h1>
        <p className="mt-2 text-sm text-taupe-600">
          {t("count", { count: shown.length })}
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {shown.map((p) => {
            const price = formatPrice(p.priceCents, p.currency, locale);
            return (
              <div key={p.id} className="flex flex-col gap-2">
                <ProductTile
                  href={p.href}
                  name={shortName(p.name)}
                  imageUrl={p.imageUrl}
                  placeholderClass={categoryColorClass(p.colorKey)}
                  priceLabel={
                    p.hasVariants ? tShop("fromPrice", { price }) : price
                  }
                  oldPriceLabel={
                    p.oldPriceCents
                      ? formatPrice(p.oldPriceCents, p.currency, locale)
                      : undefined
                  }
                  badge={
                    p.oldPriceCents && p.percentOff
                      ? `−${p.percentOff}%${p.promoLabel ? ` · ${p.promoLabel}` : ""}`
                      : (p.promoLabel ?? undefined)
                  }
                  note={p.inStock ? undefined : tShop("outOfStock")}
                  actions={<ProductActions product={p} />}
                />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="flex items-center justify-center gap-1.5 self-center rounded-full border border-cream-300 bg-white px-4 py-1.5 text-xs font-semibold text-taupe-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 sm:text-sm"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M4 7h16" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
                    <path d="M9 7V4h6v3" />
                  </svg>
                  {t("remove")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
