import { notFound } from "next/navigation";
import { getCategoryForEdit } from "@/lib/admin/queries";
import { updateCategory, deleteCategory } from "@/lib/admin/category-actions";
import CategoryForm from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategoryForEdit(id);
  if (!category) notFound();

  const roTranslation = category.translations.find((t) => t.locale === "ro");
  const enTranslation = category.translations.find((t) => t.locale === "en");

  const boundUpdate = updateCategory.bind(null, category.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-brown-800">Editează categorie</h1>
      <CategoryForm
        action={boundUpdate}
        submitLabel="Salvează modificările"
        defaultValues={{
          line: category.line,
          slug: category.slug,
          roName: roTranslation?.name ?? "",
          roDescription: roTranslation?.description ?? "",
          enName: enTranslation?.name ?? "",
          enDescription: enTranslation?.description ?? "",
          sortOrder: category.sortOrder,
        }}
      />

      <form action={deleteCategory} className="w-fit">
        <input type="hidden" name="categoryId" value={category.id} />
        <button
          type="submit"
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Șterge categoria
        </button>
      </form>
    </div>
  );
}
