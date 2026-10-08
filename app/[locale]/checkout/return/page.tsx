import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db/client";
import { formatPrice } from "@/lib/format";
import {
  AutoRefresh,
  ClearCartOnMount,
} from "@/components/checkout/ReturnHelpers";

export const dynamic = "force-dynamic";

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { locale } = await params;
  const { order: orderId } = await searchParams;
  if (!orderId) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, totalCents: true, currency: true },
  });
  if (!order) notFound();

  const t = await getTranslations("Checkout");

  const state =
    order.status === "PAID"
      ? "Paid"
      : order.status === "PENDING"
        ? "Pending"
        : "Failed";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      {state === "Paid" && <ClearCartOnMount />}
      {state === "Pending" && <AutoRefresh />}

      <div className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl text-taupe-800">
          {t(`return${state}Title`)}
        </h1>
        <p className="mt-3 text-sm text-taupe-600">
          {t(`return${state}Body`)}
        </p>

        <p className="mt-6 text-sm text-taupe-500">
          {t("orderNumber")}:{" "}
          <span className="font-mono text-taupe-800">
            #{order.id.slice(0, 8)}
          </span>
          <br />
          {formatPrice(order.totalCents, order.currency, locale)}
        </p>

        <Link
          href={state === "Failed" ? "/cart" : "/"}
          className="mt-6 inline-block text-sm font-medium text-salamander-600 hover:underline"
        >
          {state === "Failed" ? t("backToCart") : t("continueShopping")}
        </Link>
      </div>
    </div>
  );
}
