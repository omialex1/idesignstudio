import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { reconcileCardOrder } from "@/lib/orders/payment";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      ntpId: true,
      totalCents: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // a card payment that is still waiting is checked with Netopia
  const status = await reconcileCardOrder(order);
  return NextResponse.json({ status });
}
