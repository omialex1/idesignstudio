import Link from "next/link";
import { getProductsForAdmin } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import StockBadge from "@/components/admin/StockBadge";

export default async function AdminProductsPage() {
  const products = await getProductsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-brown-800">Produse</h1>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-terracotta-500 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-terracotta-600"
        >
          + Adaugă produs
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-brown-500">
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
                  <td className="px-4 py-3 font-medium text-brown-800">{name}</td>
                  <td className="px-4 py-3 text-brown-600">{categoryName}</td>
                  <td className="px-4 py-3 text-brown-800">
                    {formatPrice(p.priceCents, p.currency, "ro")}
                  </td>
                  <td className="px-4 py-3">
                    <StockBadge
                      quantityOnHand={p.inventory?.quantityOnHand ?? 0}
                      lowStockThreshold={p.inventory?.lowStockThreshold ?? 5}
                    />
                  </td>
                  <td className="px-4 py-3 text-brown-600">
                    {p.isActive ? "Da" : "Nu"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="text-terracotta-600 hover:underline"
                    >
                      Editează
                    </Link>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-brown-400">
                  Niciun produs încă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
