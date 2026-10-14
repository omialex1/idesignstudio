"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { cancelOrder } from "@/lib/orders/cancel";

export async function cancelOrderAction(
  orderId: string,
): Promise<{ message: string; error?: boolean }> {
  if (!(await isAdminAuthenticated())) throw new Error("unauthorized");

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

  const parts = ["Comanda a fost anulată."];
  if (result.stockRestored) parts.push("Stocul a fost refăcut.");
  if (result.emailed) parts.push("Clientul a primit e-mail.");
  else if (result.stockRestored)
    parts.push("E-mailul către client NU s-a trimis, anunț-l tu.");
  if (result.wasPaid) parts.push("Nu uita să rambursezi banii din Netopia.");
  return { message: parts.join(" ") };
}
