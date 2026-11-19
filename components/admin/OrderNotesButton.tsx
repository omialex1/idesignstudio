"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addOrderNoteAction,
  setOrderConfirmedAction,
  setOrderDueDateAction,
} from "@/lib/admin/order-actions";

type Note = { id: string; text: string; username: string; at: string };

// "Notițe": the notes of an order, whether it was confirmed with the customer, and its deadline.
export default function OrderNotesButton({
  orderId,
  notes,
  confirmedAt,
  dueDay,
}: {
  orderId: string;
  notes: Note[];
  // when it was confirmed, as text; null = still to be confirmed
  confirmedAt: string | null;
  // the deadline as YYYY-MM-DD, or ""
  dueDay: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [day, setDay] = useState(dueDay);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function run(
    action: () => Promise<{ message: string; error?: boolean }>,
    after?: () => void,
  ) {
    startTransition(async () => {
      try {
        const r = await action();
        setMessage({ text: r.message, error: r.error });
        if (!r.error) after?.();
      } catch {
        setMessage({ text: "Nu s-a putut salva. Încearcă din nou.", error: true });
      }
    });
  }

  const btn =
    "rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage(null);
        }}
        className="w-fit rounded-full border border-taupe-400 px-3 py-1 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100"
      >
        Notițe{notes.length > 0 ? ` (${notes.length})` : ""}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Notițe comanda ${orderId.slice(0, 8)}`}
            className="w-full max-w-lg rounded-2xl border-2 border-choc bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 rounded-t-xl bg-choc px-5 py-3 text-cream-50">
              <h2 className="font-display text-lg">
                Notițe și termen · #{orderId.slice(0, 8)}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1 text-sm hover:bg-white/10"
                aria-label="Închide"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5 p-5 text-sm text-taupe-700">
              <section className="flex flex-col gap-2 rounded-xl border border-cream-200 p-4">
                <h3 className="font-semibold text-taupe-800">Confirmată cu clientul</h3>
                <p className={confirmedAt ? "text-green-700" : "text-amber-700"}>
                  {confirmedAt
                    ? `Da, confirmată: ${confirmedAt}`
                    : "Nu încă. Sună sau scrie clientul și confirmă comanda."}
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setOrderConfirmedAction(orderId, !confirmedAt))}
                  className={`${btn} w-fit ${confirmedAt ? "border border-taupe-400 text-taupe-700 hover:bg-cream-100" : "bg-green-600 text-white hover:bg-green-700"}`}
                >
                  {confirmedAt ? "Scoate confirmarea" : "Marchează confirmată"}
                </button>
              </section>

              <section className="flex flex-col gap-2 rounded-xl border border-cream-200 p-4">
                <h3 className="font-semibold text-taupe-800">Termen (deadline)</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="rounded-lg border border-taupe-400 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-500 focus:ring-2 focus:ring-salamander-200"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setOrderDueDateAction(orderId, day))}
                    className={`${btn} bg-salamander-500 text-cream-50 hover:bg-salamander-600`}
                  >
                    Salvează termenul
                  </button>
                  {day && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() => setOrderDueDateAction(orderId, ""), () => setDay(""))
                      }
                      className={`${btn} border border-taupe-400 text-taupe-700 hover:bg-cream-100`}
                    >
                      Scoate termenul
                    </button>
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="font-semibold text-taupe-800">Notițe</h3>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="De exemplu: a sunat, vrea 2 produse în loc de unul"
                  className="rounded-lg border border-taupe-400 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-500 focus:ring-2 focus:ring-salamander-200"
                />
                <button
                  type="button"
                  disabled={pending || !text.trim()}
                  onClick={() =>
                    run(() => addOrderNoteAction(orderId, text), () => setText(""))
                  }
                  className={`${btn} w-fit bg-salamander-500 text-cream-50 hover:bg-salamander-600`}
                >
                  Adaugă notița
                </button>
                {notes.length === 0 ? (
                  <p className="text-xs text-taupe-500">Nicio notiță încă.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {notes.map((n) => (
                      <li key={n.id} className="rounded-lg border border-cream-200 px-3 py-2">
                        <div className="text-xs text-taupe-500">
                          {n.at} · {n.username}
                        </div>
                        <div className="mt-0.5 whitespace-pre-wrap text-taupe-800">
                          {n.text}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {message && (
                <p
                  role={message.error ? "alert" : "status"}
                  className={message.error ? "text-red-600" : "text-green-700"}
                >
                  {message.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
