import AdminCard from "@/components/admin/AdminCard";
import Link from "next/link";
import {
  getCategoryOptions,
  getMainCategoryOptions,
  getProductsForAdmin,
} from "@/lib/admin/queries";
import {
  ADMIN_PRODUCT_SORTS,
  filterAndSortAdminProducts,
  parseAdminProductFilter,
} from "@/lib/admin/product-filters";
import { formatPrice } from "@/lib/format";
import StockBadge from "@/components/admin/StockBadge";

const selectClass =
  "rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    cat?: string;
    sub?: string;
    vis?: string;
    stoc?: string;
  }>;
}) {
  const filter = parseAdminProductFilter(await searchParams);
  const [everything, mains, subs] = await Promise.all([
    getProductsForAdmin(),
    getMainCategoryOptions(),
    getCategoryOptions(),
  ]);
  const products = filterAndSortAdminProducts(everything, filter);
  const filtered = Boolean(
    filter.q || filter.main || filter.sub || filter.vis || filter.stoc,
  );

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

      <AdminCard
        title="Căutare, sortare și filtre"
        bodyClassName="p-4"
        actions={
          <span className="text-sm text-cream-100">
            {products.length === 1 ? "1 produs" : `${products.length} produse`}
            {filtered ? " după filtre" : ""}
          </span>
        }
      >
        <form
          method="get"
          role="search"
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-taupe-500">
            Caută
            <input
              type="search"
              name="q"
              defaultValue={filter.q}
              placeholder="Nume, adresă sau categorie"
              className={selectClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Sortează
            <select
              name="sort"
              defaultValue={filter.sort}
              className={selectClass}
            >
              {ADMIN_PRODUCT_SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Categorie
            <select
              name="cat"
              defaultValue={filter.main}
              className={selectClass}
            >
              <option value="">Toate</option>
              {mains.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Subcategorie
            <select
              name="sub"
              defaultValue={filter.sub}
              className={selectClass}
            >
              <option value="">Toate</option>
              {mains.map((m) => (
                <optgroup key={m.id} label={m.name}>
                  {subs
                    .filter((c) => c.mainCategoryId === m.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Vizibil pe site
            <select
              name="vis"
              defaultValue={filter.vis}
              className={selectClass}
            >
              <option value="">Toate</option>
              <option value="da">Da</option>
              <option value="nu">Nu (ascuns)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Stoc
            <select
              name="stoc"
              defaultValue={filter.stoc}
              className={selectClass}
            >
              <option value="">Toate</option>
              <option value="ok">În stoc</option>
              <option value="redus">Stoc redus</option>
              <option value="epuizat">Epuizat</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
          >
            Aplică
          </button>
          {(filtered || filter.sort !== "nume") && (
            <Link
              href="/admin/products"
              className="py-2 text-sm font-medium text-salamander-600 hover:underline"
            >
              Resetează
            </Link>
          )}
        </form>
      </AdminCard>

      <AdminCard title="Produse" bodyClassName="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-taupe-500">
            <tr>
              <th className="px-4 py-3 font-medium">Produs</th>
              <th className="px-4 py-3 font-medium">Subcategorie</th>
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
                <tr
                  key={p.id}
                  className="border-b border-cream-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-taupe-800">
                    {name}
                  </td>
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
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-taupe-400"
                >
                  {filtered
                    ? "Niciun produs pentru filtrele alese."
                    : "Niciun produs încă."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminCard>
    </div>
  );
}
