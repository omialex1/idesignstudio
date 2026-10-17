"use client";

import { useState, useTransition } from "react";
import { setOrderCompletedAction } from "@/lib/admin/order-actions";

// Marks an order as finished (for example shipped), or takes the mark back.
export default function CompleteOrderButton({
  orderId,
  done,
}: {
  orderId: string;
  done: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await setOrderCompletedAction(orderId, !done);
        setError(result.error ? result.message : null);
      } catch {
        setError("Nu am putut salva.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-fit rounded-full border border-taupe-400 px-3 py-1 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100 disabled:opacity-60"
      >
        {pending ? "Se salvează..." : done ? "Redeschide" : "Marchează finalizată"}
      </button>
      {error && <p className="max-w-56 text-xs text-red-600">{error}</p>}
    </div>
  );
}
