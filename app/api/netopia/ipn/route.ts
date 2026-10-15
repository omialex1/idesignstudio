import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { markOrderPaid } from "@/lib/orders/payment";
import {
  NETOPIA_CANCELED_STATUSES,
  NETOPIA_FAILED_STATUSES,
  NETOPIA_PAID_STATUSES,
  verifyNetopiaIpn,
} from "@/lib/netopia";

const ERROR_TEMPORARY = 1;
const ERROR_PERMANENT = 2;

function reply(errorType: number, errorMessage: string | null, status: number) {
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
    // Leave a short, fixed reason on the order (never anything from the request),
    // so a rejected notification can be understood from the admin.
    try {
      const claimedId = JSON.parse(rawBody)?.order?.orderID;
      if (typeof claimedId === "string") {
        const known = await prisma.order.findUnique({
          where: { id: claimedId },
          select: { notes: true, status: true },
        });
        if (
          known &&
          known.status === "PENDING" &&
          !(known.notes ?? "").includes("[Netopia a trimis")
        ) {
          await prisma.order.update({
            where: { id: claimedId },
            data: {
              notes: [
                known.notes,
                `[Netopia a trimis confirmarea, dar a fost respinsa: ${verification.detail}]`,
              ]
                .filter(Boolean)
                .join(" | ")
                .slice(0, 500),
            },
          });
        }
      }
    } catch {
      // the note is only a help
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
    await markOrderPaid(
      order.id,
      notification.payment?.ntpID ? String(notification.payment.ntpID) : null,
    );
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
