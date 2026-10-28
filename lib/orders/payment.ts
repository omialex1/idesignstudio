import { prisma } from "@/lib/db/client";
import { noteFailure, sendAlert } from "@/lib/alerts";
import { sendOrderEmails } from "@/lib/orders/emails";
import {
  NETOPIA_CANCELED_STATUSES,
  NETOPIA_FAILED_STATUSES,
  NETOPIA_PAID_STATUSES,
  fetchNetopiaPaymentStatus,
} from "@/lib/netopia";
import type { OrderStatus } from "@/lib/generated/prisma";

// Marks a card order as paid exactly once: the status change is a guarded
// update, so the notification from Netopia, the check made when the customer
// comes back and the periodic check can all call this without taking the stock
// or sending the e-mails twice. Returns true only for the call that did it.
//
// paidAt is kept when the admin cancels a paid order, so a repeated
// notification cannot mark it paid (and take stock) a second time.
export async function markOrderPaid(
  orderId: string,
  ntpId?: string | null,
): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return false;

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: { not: "PAID" }, paidAt: null },
    data: {
      status: "PAID",
      paidAt: new Date(),
      ntpId: ntpId ?? order.ntpId,
    },
  });
  if (claimed.count !== 1) return false;

  await prisma.$transaction(
    order.items.map((item) =>
      prisma.inventory.updateMany({
        where: { productId: item.productId },
        data: { quantityOnHand: { decrement: item.quantity } },
      }),
    ),
  );
  await sendOrderEmails(order);
  return true;
}

// The notification from Netopia is the normal way an order becomes paid, but it
// can be late or lost. For a card order that is still waiting, this asks
// Netopia directly what happened and updates the order. Used when the customer
// comes back after paying and by the periodic check.
export async function reconcileCardOrder(order: {
  id: string;
  status: OrderStatus;
  paymentMethod: string;
  ntpId: string | null;
  totalCents: number;
}): Promise<OrderStatus> {
  if (
    order.status !== "PENDING" ||
    order.paymentMethod !== "CARD" ||
    !order.ntpId
  ) {
    return order.status;
  }

  const result = await fetchNetopiaPaymentStatus({
    orderId: order.id,
    ntpId: order.ntpId,
  });
  if (!result) {
    // Netopia did not answer or the answer could not be read; one miss is normal,
    // several in an hour are worth a look
    await noteFailure({
      key: "netopia-status",
      threshold: 3,
      subject: "Nu pot afla starea plăților de la Netopia",
      lines: [
        "Verificarea automată a plăților (la fiecare 10 minute) nu primește răspuns valid de la Netopia, de cel puțin 3 ori în ultima oră.",
        "Comenzile cu cardul rămân în așteptare până se rezolvă. Verifică cheia NETOPIA_API_KEY din Vercel și starea Netopia.",
      ],
    });
    return order.status;
  }

  if (NETOPIA_PAID_STATUSES.includes(result.status)) {
    // never trust a status for a different amount
    if (result.amountCents !== order.totalCents) {
      console.error(
        `Netopia reports order ${order.id} paid with a different amount`,
        result.amountCents,
        order.totalCents,
      );
      await sendAlert({
        key: `amount-mismatch-${order.id}`,
        subject: "Sumă plătită diferită de cea a comenzii",
        lines: [
          `Comanda #${order.id.slice(0, 8)}: Netopia raportează plata cu o sumă diferită de total (${order.totalCents / 100} RON în comandă, ${(result.amountCents ?? 0) / 100} RON la Netopia).`,
          "Comanda NU a fost marcată plătită. Verifică în Netopia.",
        ],
        throttleMs: 24 * 60 * 60 * 1000,
      });
      return order.status;
    }
    await markOrderPaid(order.id, order.ntpId);
    return "PAID";
  }

  if (NETOPIA_CANCELED_STATUSES.includes(result.status)) {
    await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "CANCELED" },
    });
    return "CANCELED";
  }
  if (NETOPIA_FAILED_STATUSES.includes(result.status)) {
    await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return "FAILED";
  }
  return order.status;
}
