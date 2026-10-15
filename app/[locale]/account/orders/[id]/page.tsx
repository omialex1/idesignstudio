import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import { getCustomerOrder } from "@/lib/customer/queries";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/format-date";
import { itemDetails } from "@/lib/orders/item-details";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const customerId = await getCurrentCustomerId();
  if (!customerId) redirect("/account/login");

  const order = await getCustomerOrder(customerId, id);
  if (!order) notFound();

  const t = await getTranslations("Account");
  const money = (cents: number) => formatPrice(cents, order.currency, locale);

  return (
    <div className="flex flex-1 flex-col px-6 py-24">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/account/orders"
          className="text-sm font-medium text-salamander-600 hover:underline"
        >
          ← {t("backToOrders")}
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-taupe-800">
            {t("orderDetailTitle")}{" "}
            <span className="font-mono text-lg text-taupe-500">
              #{order.id.slice(0, 8)}
            </span>
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-taupe-500">
          {t("orderDate")}: {formatDateTime(order.createdAt, locale)}
          {order.paidAt && (
            <>
              {" · "}
              {t("orderPaidAt")}: {formatDateTime(order.paidAt, locale)}
            </>
          )}
        </p>

        {order.status === "CANCELED" && (
          <p className="mt-4 rounded-xl border border-cream-200 bg-cream-100 px-4 py-3 text-sm text-taupe-700">
            {t("orderCanceledNote")}
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-cream-200 bg-white p-6">
          <h2 className="font-display text-lg text-taupe-800">
            {t("orderItems")}
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-cream-100 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3">
                <span className="text-taupe-800">
                  {item.productNameSnapshot} &times; {item.quantity}
                  {itemDetails(item, locale) && (
                    <span className="block text-xs text-taupe-500">
                      {itemDetails(item, locale)}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap text-taupe-700">
                  {money(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 flex flex-col gap-1 border-t border-cream-200 pt-3 text-sm text-taupe-600">
            <div className="flex justify-between">
              <dt>{t("orderShipping")}</dt>
              <dd>
                {order.shippingCents === 0
                  ? t("orderShippingFree")
                  : money(order.shippingCents)}
              </dd>
            </div>
            {order.codFeeCents > 0 && (
              <div className="flex justify-between">
                <dt>{t("orderCodFee")}</dt>
                <dd>{money(order.codFeeCents)}</dd>
              </div>
            )}
            <div className="mt-1 flex justify-between text-base font-semibold text-taupe-800">
              <dt>{t("orderTotal")}</dt>
              <dd>{money(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-cream-200 bg-white p-6 text-sm text-taupe-600">
            <h2 className="font-display text-lg text-taupe-800">
              {t("orderDeliveryTo")}
            </h2>
            <p className="mt-2 text-taupe-800">
              {order.firstName} {order.lastName}
            </p>
            <p>{order.addressLine}</p>
            <p>
              {order.city}, {order.county} {order.postalCode}
            </p>
            <p>{order.phone}</p>
          </div>
          <div className="rounded-2xl border border-cream-200 bg-white p-6 text-sm text-taupe-600">
            <h2 className="font-display text-lg text-taupe-800">
              {t("orderPayment")}
            </h2>
            <p className="mt-2 text-taupe-800">
              {order.paymentMethod === "COD"
                ? t("orderPayCod")
                : t("orderPayCard")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
