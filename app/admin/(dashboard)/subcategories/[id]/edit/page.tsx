import { notFound } from "next/navigation";
import {
  getMainCategoryOptions,
  getSubcategoryForEdit,
} from "@/lib/admin/queries";
import {
  deleteSubcategory,
  updateSubcategory,
} from "@/lib/admin/subcategory-actions";
import SubcategoryForm from "@/components/admin/SubcategoryForm";
import DeleteButton from "@/components/admin/DeleteButton";

export default async function EditSubcategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, mainCategories] = await Promise.all([
    getSubcategoryForEdit(id),
    getMainCategoryOptions(),
  ]);
  if (!category) notFound();

  const ro = category.translations.find((t) => t.locale === "ro");
  const en = category.translations.find((t) => t.locale === "en");
  const products = category._count.products;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Editează subcategorie</h1>
      <SubcategoryForm
        onSubmit={updateSubcategory.bind(null, category.id)}
        mainCategories={mainCategories}
        submitLabel="Salvează modificările"
        defaultValues={{
          mainCategoryId: category.mainCategoryId ?? "",
          slug: category.slug,
          roName: ro?.name ?? "",
          roDescription: ro?.description ?? "",
          enName: en?.name ?? "",
          enDescription: en?.description ?? "",
          sortOrder: category.sortOrder,
        }}
      />

      <div className="w-fit">
        <DeleteButton
          action={deleteSubcategory}
          id={category.id}
          label="Șterge subcategoria"
          confirmText={`Ștergi subcategoria „${ro?.name ?? category.slug}”?`}
        />
        {products > 0 && (
          <p className="mt-1 text-xs text-taupe-400">
            Are {products} {products === 1 ? "produs" : "produse"}, deci nu poate
            fi ștearsă până nu le muți.
          </p>
        )}
      </div>
    </div>
  );
}
