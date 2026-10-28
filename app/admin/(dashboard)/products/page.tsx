import Link from "next/link";
import { getProductsForAdmin } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import StockBadge from "@/components/admin/StockBadge";
import { matchesAllWords, queryWords, MAX_QUERY_LENGTH } from "@/lib/search";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const words = queryWords(query);
  const everything = await getProductsForAdmin();
  // name (both languages), address (slug) and categories
  const products = words.length
    ? everything.filter((p) =>
        matchesAllWords(
          words,
          [
            p.slug,
            ...p.translations.map((t) => t.name),
            ...p.category.translations.map((t) => t.name),
          ].join(" "),
        ),
      )
    : everything;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-taupe-800">Produse</h1>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-salamander-600"
        >
          + Adaugă produs
        </Link>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-center gap-3"
        role="search"
      >
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Caută după nume, adresă sau categorie"
          aria-label="Caută produse"
          className="min-w-56 flex-1 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400"
        />
        <button
          type="submit"
          className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
        >
          Caută
        </button>
        {query && (
          <Link
            href="/admin/products"
            className="text-sm font-medium text-salamander-600 hover:underline"
          >
            Resetează
          </Link>
        )}
        <span className="text-sm text-taupe-500">
          {products.length === 1
            ? query
              ? "1 produs găsit"
              : "1 produs"
            : query
              ? `${products.length} produse găsite`
              : `${products.length} produse`}
        </span>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-cream-300 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-taupe-500">
            <tr>
              <th className="px-4 py-3 font-medium">Produs</th>
              <th className="px-4 py-3 font-medium">Categorie</th>
              <th className="px-4 py-3 font-medium">Preț</th>
              <th className="px-4 py-3 font-medium">Stoc</th>
              <th className="px-4 py-3 font-medium">Activ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const name =
                p.translations.find((t) => t.locale === "ro")?.name ?? p.slug;
              const categoryName =
                p.category.translations.find((t) => t.locale === "ro")?.name ??
                p.category.slug;
              return (
                <tr key={p.id} className="border-b border-cream-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-taupe-800">{name}</td>
                  <td className="px-4 py-3 text-taupe-600">{categoryName}</td>
                  <td className="px-4 py-3 text-taupe-800">
                    {formatPrice(p.priceCents, p.currency, "ro")}
                  </td>
                  <td className="px-4 py-3">
                    <StockBadge
                      quantityOnHand={p.inventory?.quantityOnHand ?? 0}
                      lowStockThreshold={p.inventory?.lowStockThreshold ?? 5}
                    />
                  </td>
                  <td className="px-4 py-3 text-taupe-600">
                    {p.isActive ? "Da" : "Nu"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="text-salamander-600 hover:underline"
                    >
                      Editează
                    </Link>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-taupe-400">
                  {query ? "Niciun produs pentru această căutare." : "Niciun produs încă."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
