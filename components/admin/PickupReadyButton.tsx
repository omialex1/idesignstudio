"use client";

import { useState, useTransition } from "react";
import { markPickupReadyAction } from "@/lib/admin/order-actions";

// "Gata de ridicare": the customer gets an email that the order can be collected.
export default function PickupReadyButton({
  orderId,
  sentAt,
}: {
  orderId: string;
  // when the customer was told (already done), as text
  sentAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);

  function handleClick() {
    if (
      sentAt &&
      !window.confirm("Clientul a primit deja emailul. Îl trimiți din nou?")
    ) {
      return;
    }
    startTransition(async () => {
      try {
        setResult(await markPickupReadyAction(orderId));
      } catch {
        setResult({ error: true, message: "Nu am putut trimite emailul." });
      }
    });
  }

  return (
    <div className="flex max-w-[14rem] flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-fit rounded-full border border-green-300 px-3 py-1 text-xs font-medium text-green-800 transition-colors hover:bg-green-50 disabled:opacity-60"
      >
        {pending
          ? "Se trimite..."
          : sentAt
            ? "Trimite din nou „Gata de ridicare”"
            : "Gata de ridicare (anunță clientul)"}
      </button>
      {sentAt && !result && (
        <p className="text-xs text-taupe-500">Clientul a fost anunțat: {sentAt}</p>
      )}
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
