import { createCategory } from "@/lib/admin/category-actions";
import CategoryForm from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-brown-800">Adaugă categorie</h1>
      <CategoryForm action={createCategory} submitLabel="Creează categorie" />
    </div>
  );
}
