import ProductCard from "./ProductCard";
import Reveal from "@/components/layout/Reveal";
import type { ProductWithTranslation } from "@/lib/db/products";
import type { MainCategory } from "@/lib/main-categories";

export default function ProductGrid({
  products,
  main,
  categorySlug,
  locale,
}: {
  products: ProductWithTranslation[];
  main: Pick<MainCategory, "slug" | "colorKey">;
  categorySlug: string;
  locale: string;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <Reveal key={product.id} index={i % 3}>
          <ProductCard
            product={product}
            main={main}
            categorySlug={categorySlug}
            locale={locale}
          />
        </Reveal>
      ))}
    </div>
  );
}
