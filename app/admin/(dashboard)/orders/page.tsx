import { getOrdersForAdmin } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import { itemDetails } from "@/lib/orders/item-details";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";

export default async function AdminOrdersPage() {
  const orders = await getOrdersForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Comenzi</h1>

      <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-taupe-500">
            <tr>
              <th className="px-4 py-3 font-medium">Comandă</th>
              <th className="px-4 py-3 font-medium">Client și livrare</th>
              <th className="px-4 py-3 font-medium">Produse</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-cream-100 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-taupe-600">
                  {o.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-taupe-800">
                  <div className="font-medium">
                    {o.firstName} {o.lastName}
                  </div>
                  <div className="text-xs text-taupe-600">
                    {o.customerEmail} · {o.phone}
                  </div>
                  <div className="text-xs text-taupe-600">
                    {o.addressLine}, {o.city}, {o.county} {o.postalCode}
                  </div>
                  {o.companyName && (
                    <div className="mt-1 text-xs font-medium text-taupe-700">
                      Firmă: {o.companyName}, CUI {o.companyCui}
                    </div>
                  )}
                  {o.notes && (
                    <div className="mt-1 text-xs italic text-taupe-500">
                      {o.notes}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-taupe-600">
                  {o.items.map((item) => (
                    <div key={item.id}>
                      {item.productNameSnapshot} &times; {item.quantity}
                      {itemDetails(item, "ro") && (
                        <div className="font-medium text-taupe-800">
                          {itemDetails(item, "ro")}
                        </div>
                      )}
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3 text-taupe-600">
                  {o.createdAt.toLocaleDateString("ro-RO")}
                </td>
                <td className="px-4 py-3 text-taupe-800">
                  {formatPrice(o.totalCents, o.currency, "ro")}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-taupe-400">
                  Nicio comandă încă.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
