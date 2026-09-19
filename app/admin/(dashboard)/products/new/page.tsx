import { getCategoryOptions } from "@/lib/admin/queries";
import { createProduct } from "@/lib/admin/product-actions";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await getCategoryOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-brown-800">Adaugă produs</h1>
      <ProductForm
        action={createProduct}
        categories={categories}
        submitLabel="Creează produs"
      />
    </div>
  );
}
