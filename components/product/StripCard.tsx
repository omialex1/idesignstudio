import { Link } from "@/i18n/navigation";
import ProductActions from "@/components/product/ProductActions";
import type { CardProduct } from "@/lib/product-card";

// What one card of a row of products ("Merge bine cu", "Noutăți") needs.
export type StripItem = {
  id: string;
  href: string;
  name: string;
  imageUrl: string | null;
  // background of the placeholder when there is no photo
  placeholderClass: string;
  // shown on the card when the product is out of stock
  note?: string;
  // the price (after the discount) and the one struck through, and the discount tag
  price?: string;
  oldPrice?: string;
  badge?: string;
  // what the heart and cart buttons need
  card: CardProduct;
  // mixed into a new random order at every visit (the others keep their place)
  shuffle?: boolean;
};

// The card of a product in those rows: the photo hangs above a small card, on its own:
// no frame, a few pixels of air, and a soft glow so it does not look stuck to the page.
export default function StripCard({ item }: { item: StripItem }) {
  return (
    <div className="group flex h-full flex-col items-center">
      <Link
        href={item.href}
        aria-label={item.name}
        className="block shrink-0 rounded-full"
      >
        <span className="block h-[108px] w-[108px] overflow-hidden rounded-full shadow-[0_8px_18px_-2px_rgba(60,40,25,0.28),0_0_18px_3px_rgba(210,168,104,0.28)] transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-[120px] sm:w-[120px]">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              draggable={false}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={`flex h-full w-full items-center justify-center font-display text-3xl ${item.placeholderClass}`}
            >
              {item.name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
      </Link>

      <div className="mt-3.5 flex w-full flex-1 flex-col items-center rounded-2xl border border-cream-200 bg-paper px-1.5 pt-2 pb-2.5 text-center shadow-[0_3px_10px_rgba(60,40,25,0.10)]">
        <Link href={item.href} className="flex flex-1 flex-col items-center">
          <h3 className="line-clamp-3 font-display text-[12px] leading-tight text-taupe-800 sm:text-[13px]">
            {item.name}
          </h3>
          {item.badge && (
            <span className="mt-1 rounded-full bg-salamander-500 px-1.5 py-0.5 text-[9px] font-semibold text-cream-50">
              {item.badge}
            </span>
          )}
          {item.note && (
            <span className="mt-1 text-[10px] text-red-600">{item.note}</span>
          )}
        </Link>
        {item.price && (
          <span className="mt-1.5 text-[11px] font-semibold text-salamander-600 sm:text-xs">
            {item.oldPrice && (
              <span className="mr-1 font-normal text-taupe-400 line-through">
                {item.oldPrice}
              </span>
            )}
            {item.price}
          </span>
        )}
        <div className="mt-1.5 border-t border-cream-200 pt-2">
          <ProductActions product={item.card} compact />
        </div>
      </div>
    </div>
  );
}
