import { notFound } from "next/navigation";
import { getMainCategoryForEdit } from "@/lib/admin/queries";
import {
  deleteMainCategory,
  updateMainCategory,
} from "@/lib/admin/main-category-actions";
import MainCategoryForm from "@/components/admin/MainCategoryForm";
import DeleteButton from "@/components/admin/DeleteButton";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const main = await getMainCategoryForEdit(id);
  if (!main) notFound();

  const ro = main.translations.find((t) => t.locale === "ro");
  const en = main.translations.find((t) => t.locale === "en");
  const subs = main._count.categories;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Editează categorie</h1>
      <MainCategoryForm
        onSubmit={updateMainCategory.bind(null, main.id)}
        submitLabel="Salvează modificările"
        slugLocked
        defaultValues={{
          slug: main.slug,
          roName: ro?.name ?? "",
          enName: en?.name ?? "",
          roHeadline: ro?.headline ?? "",
          enHeadline: en?.headline ?? "",
          roDescription: ro?.description ?? "",
          enDescription: en?.description ?? "",
          color: main.color,
          sortOrder: main.sortOrder,
        }}
      />

      <div className="w-fit">
        <DeleteButton
          action={deleteMainCategory}
          id={main.id}
          label="Șterge categoria"
          confirmText={`Ștergi categoria „${ro?.name ?? main.slug}”?`}
        />
        {subs > 0 && (
          <p className="mt-1 text-xs text-taupe-400">
            Are {subs} {subs === 1 ? "subcategorie" : "subcategorii"}, deci nu
            poate fi ștearsă până nu le muți sau le ștergi.
          </p>
        )}
      </div>
    </div>
  );
}
