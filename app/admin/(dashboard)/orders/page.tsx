import { getOrdersForAdmin } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import { itemDetails } from "@/lib/orders/item-details";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";
import CancelOrderButton from "@/components/admin/CancelOrderButton";
import Link from "next/link";
import { isUnfinishedOrder } from "@/lib/admin/unfinished";

// Romanian time, whatever the server's time zone is
const timeFormat = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const hourFormat = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { all } = await searchParams;
  const everything = await getOrdersForAdmin();
  const isUnfinished = isUnfinishedOrder;
  const unfinishedCount = everything.filter(isUnfinished).length;
  const showAll = all === "1";
  const orders = showAll
    ? everything
    : everything.filter((o) => !isUnfinished(o));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Comenzi</h1>
      {unfinishedCount > 0 && (
        <p className="-mt-3 text-sm text-taupe-500">
          {showAll
            ? `Se afișează și cele ${unfinishedCount} comenzi cu plata eșuată sau neterminată.`
            : `${unfinishedCount} comenzi cu plata eșuată sau neterminată sunt ascunse.`}{" "}
          <Link
            href={showAll ? "/admin/orders" : "/admin/orders?all=1"}
            className="font-medium text-salamander-600 hover:underline"
          >
            {showAll ? "Ascunde-le" : "Arată-le"}
          </Link>
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-cream-300 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-taupe-500">
            <tr>
              <th className="px-4 py-3 font-medium">Comandă</th>
              <th className="px-4 py-3 font-medium">Client și livrare</th>
              <th className="px-4 py-3 font-medium">Produse</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className={`border-b border-cream-100 last:border-0 ${o.status === "CANCELED" ? "opacity-60" : ""}`}
              >
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
                  {o.addressUnverified && (
                    <div className="mt-1 w-fit rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Adresă de verificat: localitatea nu e în lista oficială
                    </div>
                  )}
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
                  {timeFormat.format(o.createdAt)}
                </td>
                <td className="px-4 py-3 text-taupe-800">
                  {formatPrice(o.totalCents, o.currency, "ro")}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge
                    status={o.status}
                    unfinished={isUnfinished(o)}
                  />
                  {o.paidAt && (
                    <div className="mt-1 text-xs text-taupe-500">
                      plătită la {hourFormat.format(o.paidAt)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(o.status === "PENDING" ||
                    o.status === "COD" ||
                    o.status === "PAID") && (
                    <CancelOrderButton orderId={o.id} status={o.status} />
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-taupe-400"
                >
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
