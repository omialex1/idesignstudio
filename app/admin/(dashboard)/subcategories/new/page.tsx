import { createSubcategoryFromForm } from "@/lib/admin/subcategory-actions";
import { getMainCategoryOptions } from "@/lib/admin/queries";
import SubcategoryForm from "@/components/admin/SubcategoryForm";

export default async function NewSubcategoryPage() {
  const mainCategories = await getMainCategoryOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Adaugă subcategorie</h1>
      <SubcategoryForm
        onSubmit={createSubcategoryFromForm}
        mainCategories={mainCategories}
        submitLabel="Creează subcategoria"
      />
    </div>
  );
}
