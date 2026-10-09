import { createMainCategory } from "@/lib/admin/main-category-actions";
import MainCategoryForm from "@/components/admin/MainCategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Adaugă categorie</h1>
      <MainCategoryForm
        onSubmit={createMainCategory}
        submitLabel="Creează categoria"
      />
    </div>
  );
}
