import type { OrderStatus } from "@/lib/generated/prisma";

const STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
  CANCELED: "bg-gray-100 text-gray-600",
};

const LABELS: Record<OrderStatus, string> = {
  PENDING: "În așteptare",
  PAID: "Plătită",
  FAILED: "Eșuată",
  CANCELED: "Anulată",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
