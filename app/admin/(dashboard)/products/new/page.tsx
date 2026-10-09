import { getCategoryOptions } from "@/lib/admin/queries";
import NewProductForm from "@/components/admin/NewProductForm";

export default async function NewProductPage() {
  const categories = await getCategoryOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Adaugă produs</h1>
      <NewProductForm categories={categories} />
    </div>
  );
}
