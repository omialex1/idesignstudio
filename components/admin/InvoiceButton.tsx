"use client";

import { useState, useTransition } from "react";
import { generateInvoiceAction } from "@/lib/admin/order-actions";

// "Generează factura": shows what the invoice will say, asks for a last check,
// then makes it in Oblio. Nothing is sent to the customer.
export default function InvoiceButton({
  orderId,
  summary,
  previousError,
}: {
  orderId: string;
  summary: string;
  previousError: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);

  function handleClick() {
    const ok = window.confirm(
      `Generezi factura în Oblio (seria IDS) pentru:\n\n${summary}\n\n- Verifică numele, adresa, produsele și totalul.\n- Factura NU se trimite clientului. O trimiți tu din Oblio.\n- O factură emisă se stornează doar în Oblio.\n\nContinui?`,
    );
    if (!ok) return;
    startTransition(async () => {
      try {
        setResult(await generateInvoiceAction(orderId));
      } catch {
        setResult({ message: "Nu am putut genera factura.", error: true });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-fit rounded-full border border-salamander-500 px-3 py-1 text-xs font-semibold text-salamander-600 transition-colors hover:bg-salamander-500 hover:text-cream-50 disabled:opacity-60"
      >
        {pending ? "Se generează..." : "Generează factura"}
      </button>
      {previousError && !result && (
        <p className="max-w-56 text-xs text-red-600">
          Ultima încercare a eșuat: {previousError}
        </p>
      )}
      {result && (
        <p
          role="status"
          className={`max-w-56 text-xs ${result.error ? "text-red-600" : "text-green-700"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
