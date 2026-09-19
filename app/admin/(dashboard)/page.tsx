import Link from "next/link";
import { getDashboardStats, getProductsForAdmin } from "@/lib/admin/queries";

export default async function AdminDashboardPage() {
  const [stats, products] = await Promise.all([
    getDashboardStats(),
    getProductsForAdmin(),
  ]);

  const lowStockProducts = products.filter((p) => {
    const qty = p.inventory?.quantityOnHand ?? 0;
    const threshold = p.inventory?.lowStockThreshold ?? 5;
    return qty > 0 && qty <= threshold;
  });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl text-taupe-800">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Produse" value={stats.totalProducts} />
        <StatCard label="Stoc redus" value={stats.lowStock} accent="amber" />
        <StatCard label="Stoc epuizat" value={stats.outOfStock} accent="red" />
        <StatCard label="Comenzi" value={stats.totalOrders} />
      </div>

      <div>
        <h2 className="font-display text-lg text-taupe-800">
          Produse cu stoc redus
        </h2>
        {lowStockProducts.length === 0 ? (
          <p className="mt-2 text-sm text-taupe-500">
            Niciun produs cu stoc redus.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {lowStockProducts.map((p) => {
              const name =
                p.translations.find((t) => t.locale === "ro")?.name ?? p.slug;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-cream-200 bg-white px-4 py-2 text-sm"
                >
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="font-medium text-taupe-800 hover:underline"
                  >
                    {name}
                  </Link>
                  <span className="text-amber-700">
                    {p.inventory?.quantityOnHand ?? 0} buc.
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "red";
}) {
  const color =
    accent === "amber"
      ? "text-amber-600"
      : accent === "red"
        ? "text-red-600"
        : "text-taupe-800";
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-5">
      <p className="text-sm text-taupe-500">{label}</p>
      <p className={`mt-1 font-display text-3xl ${color}`}>{value}</p>
    </div>
  );
}
