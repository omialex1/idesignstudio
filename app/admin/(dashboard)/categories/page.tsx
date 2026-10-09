import Link from "next/link";
import { getMainCategoriesForAdmin } from "@/lib/admin/queries";
import { deleteMainCategory } from "@/lib/admin/main-category-actions";
import { categoryColorClass } from "@/lib/category-colors";
import DeleteButton from "@/components/admin/DeleteButton";

export default async function AdminCategoriesPage() {
  const mains = await getMainCategoriesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-taupe-800">Categorii</h1>
        <Link
          href="/admin/categories/new"
          className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-salamander-600"
        >
          + Adaugă categorie
        </Link>
      </div>
      <p className="-mt-3 max-w-2xl text-sm text-taupe-500">
        Categoriile sunt cele din meniul de sus al site-ului. Subcategoriile
        (Vaze, Baie etc.) se gestionează la{" "}
        <Link
          href="/admin/subcategories"
          className="text-salamander-600 hover:underline"
        >
          Subcategorii
        </Link>
        .
      </p>

      <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-taupe-500">
            <tr>
              <th className="px-4 py-3 font-medium">Categorie</th>
              <th className="px-4 py-3 font-medium">Adresă</th>
              <th className="px-4 py-3 font-medium">Ordine</th>
              <th className="px-4 py-3 font-medium">Subcategorii</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {mains.map((m) => {
              const name =
                m.translations.find((t) => t.locale === "ro")?.name ?? m.slug;
              return (
                <tr key={m.id} className="border-b border-cream-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-taupe-800">
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-md font-display text-xs ${categoryColorClass(m.color)}`}
                      >
                        {name.charAt(0).toUpperCase()}
                      </span>
                      {name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-taupe-600">/{m.slug}</td>
                  <td className="px-4 py-3 text-taupe-600">{m.sortOrder}</td>
                  <td className="px-4 py-3 text-taupe-600">
                    {m._count.categories}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start justify-end gap-4">
                      <Link
                        href={`/admin/categories/${m.id}/edit`}
                        className="text-salamander-600 hover:underline"
                      >
                        Editează
                      </Link>
                      <DeleteButton
                        action={deleteMainCategory}
                        id={m.id}
                        className="text-red-600 hover:underline"
                        confirmText={`Ștergi categoria „${name}”?`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {mains.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-taupe-400">
                  Nicio categorie încă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
