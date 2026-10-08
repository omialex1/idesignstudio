import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendOrderEmails } from "@/lib/orders/emails";
import {
  NETOPIA_CANCELED_STATUSES,
  NETOPIA_FAILED_STATUSES,
  NETOPIA_PAID_STATUSES,
  verifyNetopiaIpn,
} from "@/lib/netopia";

const ERROR_TEMPORARY = 1;
const ERROR_PERMANENT = 2;

function reply(
  errorType: number,
  errorMessage: string | null,
  status: number,
) {
  return NextResponse.json(
    { errorType, errorCode: null, errorMessage },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const verification = verifyNetopiaIpn(
    request.headers.get("verification-token"),
    rawBody,
  );
  if (!verification.ok) {
    if (verification.reason === "not_configured") {
      console.error("Netopia IPN received but NETOPIA_PUBLIC_KEY is not set");
      return reply(ERROR_TEMPORARY, "not_configured", 503);
    }
    return reply(ERROR_PERMANENT, "verification_failed", 400);
  }

  let notification: {
    payment?: { status?: number; ntpID?: string | number };
    order?: { orderID?: string };
  };
  try {
    notification = JSON.parse(rawBody);
  } catch {
    return reply(ERROR_PERMANENT, "invalid_payload", 400);
  }

  const orderId = notification.order?.orderID;
  const paymentStatus = notification.payment?.status;
  if (!orderId || typeof paymentStatus !== "number") {
    return reply(ERROR_PERMANENT, "invalid_payload", 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return reply(ERROR_PERMANENT, "order_not_found", 404);
  }

  if (NETOPIA_PAID_STATUSES.includes(paymentStatus)) {
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        ntpId: notification.payment?.ntpID
          ? String(notification.payment.ntpID)
          : order.ntpId,
      },
    });

    if (claimed.count === 1) {
      await prisma.$transaction(
        order.items.map((item) =>
          prisma.inventory.updateMany({
            where: { productId: item.productId },
            data: { quantityOnHand: { decrement: item.quantity } },
          }),
        ),
      );
      await sendOrderEmails(order);
    }
  } else if (
    order.status === "PENDING" &&
    (NETOPIA_CANCELED_STATUSES.includes(paymentStatus) ||
      NETOPIA_FAILED_STATUSES.includes(paymentStatus))
  ) {
    await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: {
        status: NETOPIA_CANCELED_STATUSES.includes(paymentStatus)
          ? "CANCELED"
          : "FAILED",
      },
    });
  }

  return reply(0, null, 200);
}
