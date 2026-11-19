import { sendEmail } from "@/lib/email/client";
import { orderConfirmationEmail } from "@/lib/email/templates/order-confirmation";
import { newOrderBusinessEmail } from "@/lib/email/templates/new-order";
import { orderPickupReadyEmail } from "@/lib/email/templates/order-pickup-ready";
import { orderUpdatedEmail } from "@/lib/email/templates/order-updated";
import { discountFlagEmail } from "@/lib/email/templates/discount-flag";
import { itemDetails } from "@/lib/orders/item-details";
import { officeEmail } from "@/lib/admin/users";
import { COMPANY } from "@/lib/seo";
import type { Order, OrderItem } from "@/lib/generated/prisma";

export type OrderWithItems = Order & { items: OrderItem[] };

// Where the studio's own notices go: contact@ and office@ (both read by the owners), plus
// ORDER_NOTIFY_EMAIL when it is set. Always at least the two fixed addresses, so a missing or
// mistyped setting can no longer mean that nobody is told about an order.
export function businessRecipients(): string[] {
  const list = [
    process.env.WITHDRAWAL_NOTIFY_EMAIL || COMPANY.email,
    officeEmail(),
    process.env.ORDER_NOTIFY_EMAIL,
  ]
    .filter((a): a is string => Boolean(a && a.includes("@")))
    .map((a) => a.trim().toLowerCase());
  return [...new Set(list)];
}

function emailItems(order: OrderWithItems, locale: string) {
  return order.items.map((item) => ({
    nameSnapshot: item.productNameSnapshot,
    details: itemDetails(item, locale),
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
  }));
}

function siteBase() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.idesignstudio.ro").replace(
    /\/$/,
    "",
  );
}

export async function sendOrderEmails(order: OrderWithItems) {
  const pickup = order.deliveryMethod === "PICKUP";
  const items = emailItems(order, order.locale);

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
      pickup,
      discountCode: order.discountCode,
      orderUrl: order.customerId
        ? `${siteBase()}/${order.locale === "en" ? "en" : "ro"}/account/orders/${order.id}`
        : undefined,
    });
    await sendEmail({ to: order.customerEmail, ...confirmation });
  } catch (err) {
    console.error("Failed to send order confirmation email", err);
  }

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
      items: emailItems(order, "ro"),
      shippingCents: order.shippingCents,
      codFeeCents: order.codFeeCents,
      paymentMethod: order.paymentMethod,
      pickup,
      discountCode: order.discountCode,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      currency: order.currency,
    });
    await sendEmail({
      to: businessRecipients(),
      replyTo: order.customerEmail,
      ...notification,
    });
  } catch (err) {
    console.error("Failed to send new order notification email", err);
  }
}

// "Your order is ready for pickup". Returns false when the e-mail could not be sent.
export async function sendPickupReadyEmail(order: Order): Promise<boolean> {
  try {
    await sendEmail({
      to: order.customerEmail,
      ...orderPickupReadyEmail({ locale: order.locale, orderId: order.id }),
    });
    return true;
  } catch (err) {
    console.error("Failed to send the pickup-ready email", err);
    return false;
  }
}

// "Your order was changed", with the order as it is now.
export async function sendOrderUpdatedEmail(
  order: OrderWithItems,
): Promise<boolean> {
  try {
    await sendEmail({
      to: order.customerEmail,
      ...orderUpdatedEmail({
        locale: order.locale,
        orderId: order.id,
        items: emailItems(order, order.locale),
        shippingCents: order.shippingCents,
        codFeeCents: order.codFeeCents,
        totalCents: order.totalCents,
        currency: order.currency,
        pickup: order.deliveryMethod === "PICKUP",
      }),
    });
    return true;
  } catch (err) {
    console.error("Failed to send the order-updated email", err);
    return false;
  }
}

// A discount code used a second time: tells the studio (never throws).
export async function sendDiscountFlagEmail(input: {
  code: string;
  reasons: string[];
  matchedOrderIds: string[];
  name: string;
  email: string;
  phone: string;
}) {
  try {
    await sendEmail({ to: businessRecipients(), ...discountFlagEmail(input) });
  } catch (err) {
    console.error("Failed to send the discount-code alert", err);
  }
}
