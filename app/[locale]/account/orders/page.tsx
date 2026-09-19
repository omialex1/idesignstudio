import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import { getCustomerOrders } from "@/lib/customer/queries";
import { formatPrice } from "@/lib/format";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";

export default async function AccountOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const customerId = await getCurrentCustomerId();
  if (!customerId) redirect("/account/login");

  const [orders, t] = await Promise.all([
    getCustomerOrders(customerId),
    getTranslations("Account"),
  ]);

  return (
    <div className="flex flex-1 flex-col px-6 py-24">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-brown-800">
            {t("ordersTitle")}
          </h1>
          <Link
            href="/account"
            className="text-sm font-medium text-terracotta-600 hover:underline"
          >
            {t("dashboardTitle")}
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="mt-6 text-sm text-brown-500">{t("noOrders")}</p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-cream-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-mono text-xs text-brown-500">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-brown-600">
                    {order.createdAt.toLocaleDateString(
                      locale === "en" ? "en-US" : "ro-RO",
                    )}
                  </p>
                </div>
                <span className="font-semibold text-brown-800">
                  {formatPrice(order.totalCents, order.currency, locale)}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
