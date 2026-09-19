import Link from "next/link";
import { getCategoriesForAdmin } from "@/lib/admin/queries";

export default async function AdminCategoriesPage() {
  const categories = await getCategoriesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-taupe-800">Categorii</h1>
        <Link
          href="/admin/categories/new"
          className="rounded-full bg-terracotta-500 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-terracotta-600"
        >
          + Adaugă categorie
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-taupe-500">
            <tr>
              <th className="px-4 py-3 font-medium">Categorie</th>
              <th className="px-4 py-3 font-medium">Linie</th>
              <th className="px-4 py-3 font-medium">Ordine</th>
              <th className="px-4 py-3 font-medium">Produse</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const name =
                c.translations.find((t) => t.locale === "ro")?.name ?? c.slug;
              return (
                <tr key={c.id} className="border-b border-cream-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-taupe-800">{name}</td>
                  <td className="px-4 py-3 text-taupe-600">
                    {c.line === "EVENTS" ? "Evenimente" : "Papetărie"}
                  </td>
                  <td className="px-4 py-3 text-taupe-600">{c.sortOrder}</td>
                  <td className="px-4 py-3 text-taupe-600">{c._count.products}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/categories/${c.id}/edit`}
                      className="text-terracotta-600 hover:underline"
                    >
                      Editează
                    </Link>
                  </td>
                </tr>
              );
            })}
            {categories.length === 0 && (
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
