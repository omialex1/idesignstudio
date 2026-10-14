import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/client";
import { orderCanceledEmail } from "@/lib/email/templates/order-canceled";

export type CancelResult =
  | { ok: true; stockRestored: boolean; emailed: boolean; wasPaid: boolean }
  | { ok: false; reason: "not_found" | "not_cancelable" };

// Cancels an order from the admin.
//  - PENDING (card payment never completed): no stock was taken, no email.
//  - COD (cash on delivery): stock was taken when the order was placed, so it is
//    put back; the customer is told.
//  - PAID (card): stock is put back and the customer is told that the money is
//    returned. The refund itself is made by hand in the Netopia admin; this
//    function does not touch Netopia. paidAt is kept on purpose, so a late
//    payment notification from Netopia can never mark the order paid again.
// Two clicks at once cannot restore the stock twice: the status change is a
// guarded update inside the same transaction as the stock change.
export async function cancelOrder(orderId: string): Promise<CancelResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, reason: "not_found" };

  const before = order.status;
  if (before !== "PENDING" && before !== "COD" && before !== "PAID") {
    return { ok: false, reason: "not_cancelable" };
  }
  const restoreStock = before === "COD" || before === "PAID";

  const done = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: before },
      data: { status: "CANCELED" },
    });
    if (claimed.count === 0) return false;
    if (restoreStock) {
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { quantityOnHand: { increment: item.quantity } },
        });
      }
    }
    return true;
  });
  if (!done) return { ok: false, reason: "not_cancelable" };

  const wasPaid = before === "PAID";
  let emailed = false;
  if (restoreStock) {
    try {
      const message = orderCanceledEmail({
        locale: order.locale,
        orderId: order.id,
        paymentMethod: order.paymentMethod,
        wasPaid,
        totalCents: order.totalCents,
        currency: order.currency,
      });
      await sendEmail({ to: order.customerEmail, ...message });
      emailed = true;
    } catch (err) {
      console.error("Failed to send order canceled email", err);
    }
  }

  return { ok: true, stockRestored: restoreStock, emailed, wasPaid };
}
