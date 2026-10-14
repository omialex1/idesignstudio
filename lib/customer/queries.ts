import { prisma } from "@/lib/db/client";

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}

// One order of this customer (never someone else's).
export async function getCustomerOrder(customerId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: { items: true },
  });
}

export async function getCustomerOrders(customerId: string) {
  return prisma.order.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}
