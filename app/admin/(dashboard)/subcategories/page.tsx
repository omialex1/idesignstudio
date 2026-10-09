import Link from "next/link";
import { getSubcategoriesForAdmin } from "@/lib/admin/queries";
import { deleteSubcategory } from "@/lib/admin/subcategory-actions";
import DeleteButton from "@/components/admin/DeleteButton";

export default async function AdminSubcategoriesPage() {
  const subcategories = await getSubcategoriesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-taupe-800">Subcategorii</h1>
        <Link
          href="/admin/subcategories/new"
          className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-salamander-600"
        >
          + Adaugă subcategorie
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-taupe-500">
            <tr>
              <th className="px-4 py-3 font-medium">Subcategorie</th>
              <th className="px-4 py-3 font-medium">Categorie</th>
              <th className="px-4 py-3 font-medium">Ordine</th>
              <th className="px-4 py-3 font-medium">Produse</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {subcategories.map((c) => {
              const name =
                c.translations.find((t) => t.locale === "ro")?.name ?? c.slug;
              const mainName = c.mainCategory
                ? (c.mainCategory.translations.find((t) => t.locale === "ro")
                    ?.name ?? c.mainCategory.slug)
                : "—";
              return (
                <tr key={c.id} className="border-b border-cream-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-taupe-800">{name}</td>
                  <td className="px-4 py-3 text-taupe-600">{mainName}</td>
                  <td className="px-4 py-3 text-taupe-600">{c.sortOrder}</td>
                  <td className="px-4 py-3 text-taupe-600">{c._count.products}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-start justify-end gap-4">
                      <Link
                        href={`/admin/subcategories/${c.id}/edit`}
                        className="text-salamander-600 hover:underline"
                      >
                        Editează
                      </Link>
                      <DeleteButton
                        action={deleteSubcategory}
                        id={c.id}
                        className="text-red-600 hover:underline"
                        confirmText={`Ștergi subcategoria „${name}”?`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {subcategories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-taupe-400">
                  Nicio subcategorie încă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
