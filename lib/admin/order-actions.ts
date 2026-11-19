"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import { cancelOrder } from "@/lib/orders/cancel";
import { prisma } from "@/lib/db/client";
import { generateInvoice } from "@/lib/orders/invoice";
import bcrypt from "bcryptjs";
import {
  editOrderItems,
  getEditCatalog,
  type CatalogProduct,
  type EditLine,
} from "@/lib/orders/edit";
import { sendOrderUpdatedEmail, sendPickupReadyEmail } from "@/lib/orders/emails";
import { MINUTE, checkRateLimits } from "@/lib/security/rate-limit";
import { formatPrice } from "@/lib/format";

export async function cancelOrderAction(
  orderId: string,
): Promise<{ message: string; error?: boolean }> {
  const admin = await requireAdmin();

  const result = await cancelOrder(orderId);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  if (!result.ok) {
    return {
      error: true,
      message:
        result.reason === "not_found"
          ? "Comanda nu mai există."
          : "Comanda nu mai poate fi anulată (a fost deja anulată sau a eșuat).",
    };
  }

  await logAdminAction(admin, "Comandă anulată", `#${orderId.slice(0, 8)}`);

  const parts = ["Comanda a fost anulată."];
  if (result.stockRestored) parts.push("Stocul a fost refăcut.");
  if (result.emailed) parts.push("Clientul a primit e-mail.");
  else if (result.stockRestored)
    parts.push("E-mailul către client NU s-a trimis, anunț-l tu.");
  if (result.wasPaid) parts.push("Nu uita să rambursezi banii din Netopia.");
  return { message: parts.join(" ") };
}

// "Genereaza factura": makes the Oblio invoice for one order, once. Nothing is
// sent to the customer.
export async function generateInvoiceAction(
  orderId: string,
): Promise<{ message: string; error?: boolean }> {
  const admin = await requireAdmin();
  const result = await generateInvoice(orderId);
  revalidatePath("/admin/orders");

  if (result.ok) {
    await logAdminAction(
      admin,
      "Factură generată",
      `${result.series} ${result.number}, comanda #${orderId.slice(0, 8)}`,
    );
    return {
      message: `Factura ${result.series} ${result.number} a fost generată în Oblio. Nu a fost trimisă clientului.`,
    };
  }
  const message =
    result.reason === "not_found"
      ? "Comanda nu mai există."
      : result.reason === "not_allowed"
        ? "Pentru această comandă nu se poate genera factură (e anulată, neplătită sau are deja una)."
        : result.reason === "busy"
          ? "Factura se generează deja sau există. Reîncarcă pagina."
          : `Oblio nu a creat factura: ${result.message ?? "eroare necunoscută"}. Poți încerca din nou.`;
  if (result.reason === "failed") {
    await logAdminAction(admin, "Factură eșuată", `comanda #${orderId.slice(0, 8)}`);
  }
  return { error: true, message };
}

// Bea marks an order as finished (for example shipped), or takes the mark back.
export async function setOrderCompletedAction(
  orderId: string,
  done: boolean,
): Promise<{ message: string; error?: boolean }> {
  const admin = await requireAdmin();
  const changed = await prisma.order.updateMany({
    where: { id: orderId, status: { in: ["COD", "PAID"] } },
    data: { completedAt: done ? new Date() : null },
  });
  revalidatePath("/admin/orders");
  if (changed.count === 0) {
    return {
      error: true,
      message: "Comanda nu poate fi marcată (e anulată sau neplătită).",
    };
  }
  await logAdminAction(
    admin,
    done ? "Comandă marcată finalizată" : "Comandă redeschisă",
    `#${orderId.slice(0, 8)}`,
  );
  return {
    message: done ? "Comanda a fost marcată finalizată." : "Comanda a fost redeschisă.",
  };
}

// ---- editing an order ----

// The products the admin can add to an order.
export async function getEditCatalogAction(): Promise<CatalogProduct[]> {
  await requireAdmin();
  return getEditCatalog();
}

export type EditOrderOutcome = {
  ok: boolean;
  message: string;
};

// Saves the new products/quantities of an order. Asks for the admin's password again, so a
// change is never an accident; every change is written in the order's history and the log.
export async function editOrderAction(
  orderId: string,
  lines: EditLine[],
  password: string,
  notifyCustomer: boolean,
): Promise<EditOrderOutcome> {
  const admin = await requireAdmin();

  const wait = await checkRateLimits([
    { action: "admin-order-edit-pw", id: admin.id, limit: 8, windowMs: 15 * MINUTE },
  ]);
  if (wait) {
    return {
      ok: false,
      message: "Prea multe încercări. Așteaptă câteva minute și încearcă din nou.",
    };
  }
  const user = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  const valid =
    !!user?.passwordHash &&
    typeof password === "string" &&
    password.length > 0 &&
    (await bcrypt.compare(password, user.passwordHash));
  if (!valid) {
    await logAdminAction(admin, "Modificare comandă refuzată", "parolă greșită");
    return { ok: false, message: "Parola nu este corectă." };
  }

  const result = await editOrderItems(orderId, lines, admin);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  if (!result.ok) return { ok: false, message: result.message };
  if (!result.changed) {
    return { ok: true, message: "Nu ai schimbat nimic la comandă." };
  }

  await logAdminAction(
    admin,
    "Comandă modificată",
    `#${orderId.slice(0, 8)}: ${result.summary}`,
  );

  const parts = [
    `Comanda a fost modificată. Total nou: ${formatPrice(result.newTotalCents, result.order.currency, "ro")}.`,
  ];
  const diff = result.newTotalCents - result.oldTotalCents;
  if (diff !== 0 && result.order.status === "PAID") {
    parts.push(
      diff < 0
        ? `Clientul a plătit deja cu cardul: rambursează ${formatPrice(-diff, result.order.currency, "ro")} din Netopia.`
        : `Clientul a plătit deja cu cardul: mai are de plătit ${formatPrice(diff, result.order.currency, "ro")} (de exemplu ramburs sau o plată separată).`,
    );
  }
  if (notifyCustomer) {
    parts.push(
      (await sendOrderUpdatedEmail(result.order))
        ? "Clientul a primit email cu comanda modificată."
        : "Emailul către client NU s-a trimis, anunț-l tu.",
    );
  }
  return { ok: true, message: parts.join(" ") };
}

// "Gata de ridicare": tells the customer by email that a pickup order can be collected.
export async function markPickupReadyAction(
  orderId: string,
): Promise<{ message: string; error?: boolean }> {
  const admin = await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (
    !order ||
    order.deliveryMethod !== "PICKUP" ||
    (order.status !== "PAID" && order.status !== "COD")
  ) {
    return {
      error: true,
      message: "Comanda nu este o ridicare personală plătită.",
    };
  }
  if (!(await sendPickupReadyEmail(order))) {
    return {
      error: true,
      message: "Emailul NU s-a trimis. Încearcă din nou sau anunță clientul tu.",
    };
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { pickupReadyAt: new Date() },
  });
  revalidatePath("/admin/orders");
  await logAdminAction(
    admin,
    "Ridicare anunțată",
    `#${orderId.slice(0, 8)}, clientul a primit email`,
  );
  return { message: "Clientul a primit email că poate ridica comanda." };
}
