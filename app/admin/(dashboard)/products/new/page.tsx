import { getCategoryOptions } from "@/lib/admin/queries";
import { createProduct } from "@/lib/admin/product-actions";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await getCategoryOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Adaugă produs</h1>
      <p className="-mt-3 max-w-2xl text-sm text-taupe-500">
        Fotografiile se adaugă după ce salvezi produsul: te ducem direct pe
        pagina lui de editare, la secțiunea Fotografii.
      </p>
      <ProductForm
        action={createProduct}
        categories={categories}
        submitLabel="Creează produs"
      />
    </div>
  );
}
