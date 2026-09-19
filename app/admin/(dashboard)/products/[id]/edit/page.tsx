import { notFound } from "next/navigation";
import { getCategoryOptions, getProductForEdit } from "@/lib/admin/queries";
import { updateProduct, deleteProduct } from "@/lib/admin/product-actions";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductForEdit(id),
    getCategoryOptions(),
  ]);

  if (!product) notFound();

  const roTranslation = product.translations.find((t) => t.locale === "ro");
  const enTranslation = product.translations.find((t) => t.locale === "en");

  const boundUpdate = updateProduct.bind(null, product.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-brown-800">Editează produs</h1>
      <ProductForm
        action={boundUpdate}
        categories={categories}
        submitLabel="Salvează modificările"
        defaultValues={{
          categoryId: product.categoryId,
          slug: product.slug,
          roName: roTranslation?.name ?? "",
          roDescription: roTranslation?.description ?? "",
          enName: enTranslation?.name ?? "",
          enDescription: enTranslation?.description ?? "",
          priceRon: (product.priceCents / 100).toFixed(2),
          quantityOnHand: product.inventory?.quantityOnHand ?? 0,
          lowStockThreshold: product.inventory?.lowStockThreshold ?? 5,
          isActive: product.isActive,
        }}
      />

      <form action={deleteProduct} className="w-fit">
        <input type="hidden" name="productId" value={product.id} />
        <button
          type="submit"
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Șterge produsul
        </button>
      </form>
    </div>
  );
}
