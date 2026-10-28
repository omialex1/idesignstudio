import { getOrdersForAdmin } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import { itemDetails } from "@/lib/orders/item-details";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";
import CancelOrderButton from "@/components/admin/CancelOrderButton";
import Link from "next/link";
import { isUnfinishedOrder } from "@/lib/admin/unfinished";
import InvoiceButton from "@/components/admin/InvoiceButton";
import CompleteOrderButton from "@/components/admin/CompleteOrderButton";
import {
  STAGE_LABELS,
  filterOrders,
  orderStage,
  parseOrderFilter,
  romanianDate,
} from "@/lib/admin/order-stage";
import { canInvoice } from "@/lib/orders/invoice";

const MONTHS = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
];

const selectClass =
  "rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

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

// What Bea sees in the confirmation before the invoice is made.
function invoiceSummary(o: Awaited<ReturnType<typeof getOrdersForAdmin>>[number]) {
  const client = o.companyName
    ? `${o.companyName} (CUI ${o.companyCui})`
    : `${o.firstName} ${o.lastName}`;
  const lines = o.items
    .map((i) => `  - ${i.productNameSnapshot} × ${i.quantity}`)
    .join("\n");
  return [
    `Comanda #${o.id.slice(0, 8)} (${o.paymentMethod === "COD" ? "ramburs" : "card, plătită"})`,
    `Client: ${client}`,
    `Adresă: ${o.addressLine}, ${o.city}, ${o.county}`,
    `Produse:\n${lines}`,
    `Transport: ${formatPrice(o.shippingCents, o.currency, "ro")}${o.codFeeCents > 0 ? `, taxă ramburs: ${formatPrice(o.codFeeCents, o.currency, "ro")}` : ""}`,
    `Total: ${formatPrice(o.totalCents, o.currency, "ro")}`,
  ].join("\n");
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    all?: string;
    stare?: string;
    an?: string;
    luna?: string;
    zi?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const filter = parseOrderFilter(params);
  const everything = await getOrdersForAdmin();
  const isUnfinished = isUnfinishedOrder;
  const unfinishedCount = everything.filter(isUnfinished).length;
  const orders = filterOrders(everything, filter);

  // years that have orders, plus the current one
  const thisYear = romanianDate(new Date()).y;
  const years = Array.from(
    new Set([thisYear, ...everything.map((o) => romanianDate(o.createdAt).y)]),
  ).sort((x, y) => y - x);

  const hasFilter = Boolean(
    filter.q || filter.stage || filter.year || filter.month || filter.day,
  );
  // keeps the chosen filters when the "unfinished" switch is clicked
  const keep = new URLSearchParams();
  if (filter.q) keep.set("q", filter.q);
  if (filter.stage) keep.set("stare", filter.stage);
  if (filter.year) keep.set("an", String(filter.year));
  if (filter.month) keep.set("luna", String(filter.month));
  if (filter.day) keep.set("zi", String(filter.day));
  const toggleQuery = new URLSearchParams(keep);
  if (!filter.showUnfinished) toggleQuery.set("all", "1");
  const toggleHref = `/admin/orders${toggleQuery.size ? `?${toggleQuery}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Comenzi</h1>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-cream-300 bg-white p-4 shadow-sm"
      >
        {filter.showUnfinished && <input type="hidden" name="all" value="1" />}
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-taupe-500">
          Caută
          <input
            type="search"
            name="q"
            defaultValue={filter.q}
            placeholder="Nume, e-mail, telefon, produs, nr. comandă sau factură"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
          Stare
          <select name="stare" defaultValue={filter.stage ?? ""} className={selectClass}>
            <option value="">Toate</option>
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
          An
          <select name="an" defaultValue={filter.year ?? ""} className={selectClass}>
            <option value="">Toți</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
          Luna
          <select name="luna" defaultValue={filter.month ?? ""} className={selectClass}>
            <option value="">Toate</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
          Ziua
          <select name="zi" defaultValue={filter.day ?? ""} className={selectClass}>
            <option value="">Toate</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
        >
          Aplică
        </button>
        {hasFilter && (
          <Link
            href={filter.showUnfinished ? "/admin/orders?all=1" : "/admin/orders"}
            className="py-2 text-sm font-medium text-salamander-600 hover:underline"
          >
            Resetează
          </Link>
        )}
      </form>

      <p className="-mt-3 text-sm text-taupe-500">
        {orders.length === 1 ? "1 comandă" : `${orders.length} comenzi`}
        {hasFilter ? " după filtre" : ""}.
        {unfinishedCount > 0 && !filter.stage && (
          <>
            {" "}
            {filter.showUnfinished
              ? `Se afișează și cele ${unfinishedCount} comenzi cu plata eșuată sau neterminată.`
              : `${unfinishedCount} comenzi cu plata eșuată sau neterminată sunt ascunse.`}{" "}
            <Link
              href={toggleHref}
              className="font-medium text-salamander-600 hover:underline"
            >
              {filter.showUnfinished ? "Ascunde-le" : "Arată-le"}
            </Link>
          </>
        )}
      </p>

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
                  {orderStage(o) === "finalizata" && (
                    <div className="mt-1 w-fit rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      Finalizată
                    </div>
                  )}
                  {o.invoiceNumber && (
                    <div className="mt-1 text-xs">
                      {o.invoiceUrl ? (
                        <a
                          href={o.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-green-700 hover:underline"
                        >
                          Facturată {o.invoiceSeries} {o.invoiceNumber}
                        </a>
                      ) : (
                        <span className="font-semibold text-green-700">
                          Facturată {o.invoiceSeries} {o.invoiceNumber}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-2">
                    {canInvoice(o) && (
                      <InvoiceButton
                        orderId={o.id}
                        summary={invoiceSummary(o)}
                        previousError={o.invoiceError}
                      />
                    )}
                    {(o.status === "COD" || o.status === "PAID") && (
                      <CompleteOrderButton
                        orderId={o.id}
                        done={o.completedAt !== null}
                      />
                    )}
                    {(o.status === "PENDING" ||
                      o.status === "COD" ||
                      o.status === "PAID") && (
                      <CancelOrderButton orderId={o.id} status={o.status} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-taupe-400"
                >
                  {hasFilter ? "Nicio comandă pentru filtrele alese." : "Nicio comandă încă."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
