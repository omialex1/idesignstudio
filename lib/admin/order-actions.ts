"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import { cancelOrder } from "@/lib/orders/cancel";
import { prisma } from "@/lib/db/client";
import { generateInvoice } from "@/lib/orders/invoice";

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
