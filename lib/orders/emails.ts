import { sendEmail } from "@/lib/email/client";
import { orderConfirmationEmail } from "@/lib/email/templates/order-confirmation";
import { newOrderBusinessEmail } from "@/lib/email/templates/new-order";
import { itemDetails } from "@/lib/orders/item-details";
import type { Order, OrderItem } from "@/lib/generated/prisma";

export type OrderWithItems = Order & { items: OrderItem[] };

export async function sendOrderEmails(order: OrderWithItems) {
  const toEmailItems = (locale: string) =>
    order.items.map((item) => ({
      nameSnapshot: item.productNameSnapshot,
      details: itemDetails(item, locale),
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    }));
  const items = toEmailItems(order.locale);

  try {
    const confirmation = orderConfirmationEmail({
      locale: order.locale,
      orderId: order.id,
      items,
      shippingCents: order.shippingCents,
      codFeeCents: order.codFeeCents,
      totalCents: order.totalCents,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      orderUrl: order.customerId
        ? `${(process.env.NEXT_PUBLIC_SITE_URL || "https://www.idesignstudio.ro").replace(/\/$/, "")}/${order.locale === "en" ? "en" : "ro"}/account/orders/${order.id}`
        : undefined,
    });
    await sendEmail({ to: order.customerEmail, ...confirmation });
  } catch (err) {
    console.error("Failed to send order confirmation email", err);
  }

  const businessEmail =
    process.env.ORDER_NOTIFY_EMAIL ?? process.env.WITHDRAWAL_NOTIFY_EMAIL;
  if (!businessEmail) return;

  try {
    const notification = newOrderBusinessEmail({
      orderId: order.id,
      customerEmail: order.customerEmail,
      firstName: order.firstName,
      lastName: order.lastName,
      phone: order.phone,
      addressLine: order.addressLine,
      city: order.city,
      county: order.county,
      postalCode: order.postalCode,
      notes: order.notes,
      companyName: order.companyName,
      companyCui: order.companyCui,
      addressUnverified: order.addressUnverified,
      items: toEmailItems("ro"),
      shippingCents: order.shippingCents,
      codFeeCents: order.codFeeCents,
      paymentMethod: order.paymentMethod,
      totalCents: order.totalCents,
      currency: order.currency,
    });
    await sendEmail({
      to: businessEmail,
      replyTo: order.customerEmail,
      ...notification,
    });
  } catch (err) {
    console.error("Failed to send new order notification email", err);
  }
}
