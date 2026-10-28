import { prisma } from "@/lib/db/client";
import { createInvoice, type OblioInvoiceRequest } from "@/lib/oblio";
import { sendAlert } from "@/lib/alerts";
import type { Order, OrderItem } from "@/lib/generated/prisma";

export type OrderWithItems = Order & { items: OrderItem[] };

const COMPANY_CIF = "52863632";

const ron = (cents: number) => Math.round(cents) / 100;

// What the invoice will say, built only from the order. Nothing is sent to the
// customer by Oblio (sendEmail 0): Bea sends the invoice herself after checking.
export function buildInvoiceRequest(
  order: OrderWithItems,
  seriesName: string,
): OblioInvoiceRequest {
  const en = order.locale === "en";
  const company = order.companyName && order.companyCui;

  const products: OblioInvoiceRequest["products"] = order.items.map((item) => ({
    name: item.productNameSnapshot,
    description: item.variantName ?? undefined,
    price: ron(item.unitPriceCents),
    quantity: item.quantity,
    measuringUnit: "buc",
    save: 0,
  }));
  if (order.shippingCents > 0) {
    products.push({
      name: en ? "Shipping" : "Transport",
      price: ron(order.shippingCents),
      quantity: 1,
      measuringUnit: "buc",
      save: 0,
    });
  }
  if (order.codFeeCents > 0) {
    products.push({
      name: en ? "Cash on delivery fee" : "Taxă ramburs",
      price: ron(order.codFeeCents),
      quantity: 1,
      measuringUnit: "buc",
      save: 0,
    });
  }

  return {
    cif: COMPANY_CIF,
    seriesName,
    language: en ? "EN" : "RO",
    currency: order.currency,
    idempotencyKey: `order-${order.id}`,
    orderNumber: order.id.slice(0, 8),
    sendEmail: 0,
    spvExtern: process.env.OBLIO_SPV_EXTERN === "on" ? 1 : 0,
    client: {
      name: company ? order.companyName! : `${order.firstName} ${order.lastName}`,
      ...(company
        ? {
            cif: order.companyCui!,
            vatPayer: order.companyCui!.startsWith("RO")
              ? (1 as const)
              : (0 as const),
          }
        : {}),
      address: order.addressLine,
      state: order.county,
      city: order.city,
      country: "Romania",
      email: order.customerEmail,
      phone: order.phone,
      save: 0,
    },
    products,
    // Card orders are already paid; cash on delivery is collected by the courier later.
    ...(order.paymentMethod === "CARD"
      ? {
          collect: {
            type: "Card",
            value: ron(order.totalCents),
            documentNumber: order.ntpId ?? order.id.slice(0, 8),
          },
        }
      : {}),
  };
}

// Only orders that are really going to be fulfilled get an invoice: paid by
// card, or cash on delivery. Not canceled, failed or still unpaid.
export function canInvoice(order: Pick<Order, "status" | "invoiceNumber">) {
  return (
    (order.status === "PAID" || order.status === "COD") && !order.invoiceNumber
  );
}

export type InvoiceResult =
  | { ok: true; series: string; number: string; url: string }
  | { ok: false; reason: "not_found" | "not_allowed" | "busy" | "failed"; message?: string };

// Makes the invoice for one order in Oblio, once. The order is claimed first so
// two clicks (or two admins) cannot make two invoices; Oblio also gets an
// idempotency key per order. A failure is saved on the order and the claim is
// released, so the button can be pressed again.
export async function generateInvoice(orderId: string): Promise<InvoiceResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, reason: "not_found" };
  if (!canInvoice(order)) return { ok: false, reason: "not_allowed" };

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, invoiceNumber: null, invoiceClaimedAt: null },
    data: { invoiceClaimedAt: new Date(), invoiceError: null },
  });
  if (claimed.count === 0) return { ok: false, reason: "busy" };

  try {
    const seriesName = process.env.OBLIO_SERIES || "IDS";
    const invoice = await createInvoice(buildInvoiceRequest(order, seriesName));
    await prisma.order.update({
      where: { id: order.id },
      data: {
        invoiceSeries: invoice.seriesName,
        invoiceNumber: invoice.number,
        invoiceUrl: invoice.link,
        invoicedAt: new Date(),
      },
    });
    return {
      ok: true,
      series: invoice.seriesName,
      number: invoice.number,
      url: invoice.link,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : "unknown error";
    console.error("Failed to issue Oblio invoice", err);
    await prisma.order
      .update({
        where: { id: order.id },
        data: { invoiceClaimedAt: null, invoiceError: message },
      })
      .catch(() => {});
    await sendAlert({
      key: `invoice-failed-${order.id}`,
      subject: "Factura nu s-a generat în Oblio",
      lines: [
        `Comanda #${order.id.slice(0, 8)}: Oblio nu a creat factura.`,
        `Motiv: ${message}`,
        "Butonul „Generează factura” rămâne disponibil pe comandă, în admin.",
      ],
      throttleMs: 6 * 60 * 60 * 1000,
    });
    return { ok: false, reason: "failed", message };
  }
}
