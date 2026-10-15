import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { reconcileCardOrder } from "@/lib/orders/payment";

export const dynamic = "force-dynamic";

// Called every few minutes by a Vercel cron job. A card order whose payment was
// confirmed by Netopia but whose notification never arrived (or was rejected)
// would stay "waiting" for ever; this asks Netopia about every card order that
// has been waiting for a while and updates it.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const waiting = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentMethod: "CARD",
      ntpId: { not: null },
      createdAt: {
        gt: new Date(now - 3 * 24 * 60 * 60 * 1000),
        lt: new Date(now - 60 * 1000),
      },
    },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      ntpId: true,
      totalCents: true,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const changed: Record<string, number> = {};
  for (const order of waiting) {
    const status = await reconcileCardOrder(order);
    if (status !== order.status) changed[status] = (changed[status] ?? 0) + 1;
  }

  return NextResponse.json({ checked: waiting.length, changed });
}
