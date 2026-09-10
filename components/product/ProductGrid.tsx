import ProductCard from "./ProductCard";
import type { ProductWithTranslation } from "@/lib/db/products";
import type { ProductLine } from "@/lib/generated/prisma";

export default function ProductGrid({
  products,
  line,
  categorySlug,
  locale,
}: {
  products: ProductWithTranslation[];
  line: ProductLine;
  categorySlug: string;
  locale: string;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          line={line}
          categorySlug={categorySlug}
          locale={locale}
        />
      ))}
    </div>
  );
}
