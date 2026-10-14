"use client";

import { useState, useTransition } from "react";
import { cancelOrderAction } from "@/lib/admin/order-actions";

type Status = "PENDING" | "COD" | "PAID";

const CONFIRM: Record<Status, string> = {
  PENDING:
    "Comanda nu a fost plătită. Se marchează anulată. Stocul nu se modifică și clientul nu primește e-mail.\n\nContinui?",
  COD: "Comanda (ramburs) se anulează.\n\n- Stocul se reface.\n- Clientul primește un e-mail că a fost anulată.\n- Dacă ai emis factură în Oblio, stornează-o tu acolo.\n- Dacă ai făcut deja AWB, anulează-l la curier.\n\nContinui?",
  PAID: "Comanda a fost PLĂTITĂ cu cardul.\n\n- Anularea NU returnează banii. Rambursarea o faci tu în Netopia, la Comenzi.\n- Stocul se reface.\n- Clientul primește un e-mail că banii se returnează.\n- Dacă ai emis factură în Oblio, stornează-o tu acolo.\n- Dacă ai făcut deja AWB, anulează-l la curier.\n\nContinui?",
};

export default function CancelOrderButton({
  orderId,
  status,
}: {
  orderId: string;
  status: Status;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);

  function handleClick() {
    if (!window.confirm(CONFIRM[status])) return;
    startTransition(async () => {
      try {
        setResult(await cancelOrderAction(orderId));
      } catch {
        setResult({
          error: true,
          message: "Nu s-a putut anula comanda. Încearcă din nou.",
        });
      }
    });
  }

  return (
    <div className="flex max-w-[14rem] flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-fit rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Se anulează…" : "Anulează comanda"}
      </button>
      {result && (
        <p
          role="status"
          className={`text-xs ${result.error ? "text-red-600" : "text-taupe-600"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
