"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editOrderAction, getEditCatalogAction } from "@/lib/admin/order-actions";
import type { CatalogProduct, EditLine } from "@/lib/orders/edit";
import { orderCharges } from "@/lib/shipping";
import { formatPrice } from "@/lib/format";

export type EditableOrderView = {
  id: string;
  status: string;
  paymentMethod: "CARD" | "COD";
  deliveryMethod: "COURIER" | "PICKUP";
  currency: string;
  totalCents: number;
  // what the customer paid by card (before any edit); only for paid card orders
  paidCents: number | null;
  discountCode: string | null;
  codeRemovesCodFee: boolean;
  items: {
    id: string;
    name: string;
    details: string;
    unitPriceCents: number;
    quantity: number;
  }[];
  changes: {
    id: string;
    summary: string;
    username: string;
    at: string;
    oldTotalCents: number;
    newTotalCents: number;
  }[];
};

type Addition = {
  key: number;
  productId: string;
  name: string;
  variantId: string | null;
  variantName: string | null;
  quantity: string;
  price: string;
  note: string;
};

const inputClass =
  "rounded-lg border border-taupe-400 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-500 focus:ring-2 focus:ring-salamander-200";

function toCents(value: string): number | null {
  const n = Number(value.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function toQuantity(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value);
}

export default function EditOrderButton({
  order,
  blockReason,
}: {
  order: EditableOrderView;
  // why the order cannot be edited (shown instead of the form); null = it can
  blockReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogProduct[] | null>(null);

  function openDialog() {
    setOpen(true);
    if (!blockReason && !catalog) {
      getEditCatalogAction()
        .then(setCatalog)
        .catch(() => setCatalog([]));
    }
  }

  // after a save the page reloads the order: the form starts again from the new quantities
  const signature = order.items.map((i) => `${i.id}:${i.quantity}`).join(",");

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="w-fit rounded-full border border-taupe-400 px-3 py-1 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100"
      >
        Editează comanda
      </button>
      {open && (
        <EditOrderDialog
          key={signature}
          order={order}
          blockReason={blockReason}
          catalog={catalog}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EditOrderDialog({
  order,
  blockReason,
  catalog,
  onClose,
}: {
  order: EditableOrderView;
  blockReason: string | null;
  catalog: CatalogProduct[] | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.map((i) => [i.id, String(i.quantity)])),
  );
  const [additions, setAdditions] = useState<Addition[]>([]);
  const [password, setPassword] = useState("");
  const [notify, setNotify] = useState(true);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  // the "add a product" mini form
  const [search, setSearch] = useState("");
  const [pickId, setPickId] = useState("");
  const [pickVariant, setPickVariant] = useState("");
  const [pickQty, setPickQty] = useState("1");
  const [pickPrice, setPickPrice] = useState("");
  const [pickNote, setPickNote] = useState("");

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const money = (cents: number) => formatPrice(cents, order.currency, "ro");

  const lineQty = (id: string): number | null => toQuantity(quantities[id] ?? "");
  const additionRows = additions.map((a) => ({
    a,
    qty: toQuantity(a.quantity),
    cents: toCents(a.price),
  }));
  const valid =
    order.items.every((i) => lineQty(i.id) !== null) &&
    additionRows.every((r) => r.qty !== null && r.qty > 0 && r.cents !== null);

  const totals = useMemo(() => {
    const subtotal =
      order.items.reduce((sum, i) => sum + i.unitPriceCents * (lineQty(i.id) ?? 0), 0) +
      additionRows.reduce((sum, r) => sum + (r.cents ?? 0) * (r.qty ?? 0), 0);
    return {
      subtotal,
      ...orderCharges({
        subtotalCents: subtotal,
        pickup: order.deliveryMethod === "PICKUP",
        cod: order.paymentMethod === "COD",
        code: order.discountCode
          ? { removesCodFee: order.codeRemovesCodFee }
          : null,
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantities, additions, order]);

  const empty =
    order.items.every((i) => lineQty(i.id) === 0) && additions.length === 0;
  const changedSomething =
    order.items.some((i) => lineQty(i.id) !== i.quantity) || additions.length > 0;

  const needle = search.trim().toLowerCase();
  const matches = (catalog ?? []).filter(
    (p) => !needle || p.name.toLowerCase().includes(needle),
  );
  const picked = (catalog ?? []).find((p) => p.id === pickId) ?? null;

  function choose(id: string) {
    setPickId(id);
    setPickVariant("");
    const p = (catalog ?? []).find((x) => x.id === id);
    setPickPrice(p && p.variants.length === 0 ? (p.priceCents / 100).toFixed(2) : "");
  }
  function chooseVariant(id: string) {
    setPickVariant(id);
    const v = picked?.variants.find((x) => x.id === id);
    if (v) setPickPrice((v.priceCents / 100).toFixed(2));
  }
  const canAdd =
    !!picked &&
    (picked.variants.length === 0 || !!pickVariant) &&
    toQuantity(pickQty) !== null &&
    (toQuantity(pickQty) ?? 0) > 0 &&
    toCents(pickPrice) !== null;

  function addPicked() {
    if (!picked || !canAdd) return;
    const variant = picked.variants.find((v) => v.id === pickVariant) ?? null;
    setAdditions((list) => [
      ...list,
      {
        key: Date.now() + list.length,
        productId: picked.id,
        name: picked.name,
        variantId: variant?.id ?? null,
        variantName: variant?.name ?? null,
        quantity: pickQty,
        price: pickPrice,
        note: pickNote,
      },
    ]);
    setPickId("");
    setPickVariant("");
    setPickQty("1");
    setPickPrice("");
    setPickNote("");
    setSearch("");
  }

  function save() {
    if (!valid || !changedSomething) return;
    const lines: EditLine[] = [
      ...order.items.map((i) => ({
        itemId: i.id,
        quantity: lineQty(i.id) ?? i.quantity,
      })),
      ...additionRows.map(({ a, qty, cents }) => ({
        productId: a.productId,
        variantId: a.variantId,
        quantity: qty ?? 0,
        unitPriceCents: cents ?? 0,
        note: a.note || null,
      })),
    ];
    startTransition(async () => {
      try {
        const outcome = await editOrderAction(order.id, lines, password, notify);
        setResult(outcome);
        if (outcome.ok) {
          setPassword("");
          router.refresh();
        }
      } catch {
        setResult({ ok: false, message: "Nu s-a putut salva. Încearcă din nou." });
      }
    });
  }

  const diff = order.paidCents !== null ? totals.totalCents - order.paidCents : 0;

  return (
    <>
      {(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Editează comanda ${order.id.slice(0, 8)}`}
            className="w-full max-w-3xl rounded-2xl border-2 border-choc bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 rounded-t-xl bg-choc px-6 py-3 text-cream-50">
              <h2 className="font-display text-xl">
                Editează comanda #{order.id.slice(0, 8)}
              </h2>
              <button
                type="button"
                onClick={() => onClose()}
                className="rounded-full px-3 py-1 text-sm hover:bg-white/10"
                aria-label="Închide"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5 p-6 text-sm text-taupe-700">
              {blockReason ? (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
                >
                  {blockReason}
                </p>
              ) : (
                <>
                  <div>
                    <h3 className="mb-2 font-semibold text-taupe-800">Produse</h3>
                    <ul className="flex flex-col divide-y divide-cream-200 rounded-lg border border-cream-200">
                      {order.items.map((i) => {
                        const q = lineQty(i.id);
                        return (
                          <li
                            key={i.id}
                            className={`flex flex-wrap items-center gap-3 px-3 py-2 ${q === 0 ? "bg-red-50" : ""}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div
                                className={`font-medium text-taupe-800 ${q === 0 ? "line-through" : ""}`}
                              >
                                {i.name}
                              </div>
                              {i.details && (
                                <div className="text-xs text-taupe-500">
                                  {i.details}
                                </div>
                              )}
                              <div className="text-xs text-taupe-500">
                                {money(i.unitPriceCents)} / buc.
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs">
                              Cantitate
                              <input
                                inputMode="numeric"
                                value={quantities[i.id] ?? ""}
                                onChange={(e) =>
                                  setQuantities((s) => ({
                                    ...s,
                                    [i.id]: e.target.value.replace(/\D/g, ""),
                                  }))
                                }
                                aria-invalid={q === null}
                                className={`${inputClass} w-20 text-center`}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setQuantities((s) => ({
                                  ...s,
                                  [i.id]: q === 0 ? String(i.quantity) : "0",
                                }))
                              }
                              className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              {q === 0 ? "Păstrează" : "Scoate"}
                            </button>
                            <span className="w-24 text-right font-medium text-taupe-800">
                              {money(i.unitPriceCents * (q ?? 0))}
                            </span>
                          </li>
                        );
                      })}
                      {additionRows.map(({ a, qty, cents }) => (
                        <li
                          key={a.key}
                          className="flex flex-wrap items-center gap-3 bg-green-50 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-taupe-800">
                              <span className="mr-2 rounded bg-green-200 px-1.5 text-xs text-green-900">
                                nou
                              </span>
                              {a.name}
                              {a.variantName ? ` (${a.variantName})` : ""}
                            </div>
                            {a.note && (
                              <div className="text-xs text-taupe-500">{a.note}</div>
                            )}
                            <div className="text-xs text-taupe-500">
                              {cents !== null ? money(cents) : "preț invalid"} / buc. ×{" "}
                              {qty ?? "?"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setAdditions((list) =>
                                list.filter((x) => x.key !== a.key),
                              )
                            }
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Elimină
                          </button>
                          <span className="w-24 text-right font-medium text-taupe-800">
                            {money((cents ?? 0) * (qty ?? 0))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-cream-200 bg-cream-50 p-4">
                    <h3 className="mb-2 font-semibold text-taupe-800">
                      Adaugă un produs
                    </h3>
                    {catalog === null ? (
                      <p className="text-xs text-taupe-500">Se încarcă produsele…</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <input
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Caută produsul după nume"
                          className={inputClass}
                        />
                        <select
                          value={pickId}
                          onChange={(e) => choose(e.target.value)}
                          className={inputClass}
                          size={Math.min(6, Math.max(2, matches.length))}
                        >
                          {matches.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {picked && (
                          <div className="flex flex-wrap items-end gap-3">
                            {picked.variants.length > 0 && (
                              <label className="flex flex-col gap-1 text-xs">
                                Variantă
                                <select
                                  value={pickVariant}
                                  onChange={(e) => chooseVariant(e.target.value)}
                                  className={inputClass}
                                >
                                  <option value="">Alege varianta</option>
                                  {picked.variants.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.name} ({money(v.priceCents)})
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                            <label className="flex flex-col gap-1 text-xs">
                              Cantitate
                              <input
                                inputMode="numeric"
                                value={pickQty}
                                onChange={(e) =>
                                  setPickQty(e.target.value.replace(/\D/g, ""))
                                }
                                className={`${inputClass} w-20 text-center`}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              Preț / buc. (lei)
                              <input
                                inputMode="decimal"
                                value={pickPrice}
                                onChange={(e) => setPickPrice(e.target.value)}
                                className={`${inputClass} w-28`}
                              />
                            </label>
                            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs">
                              Culori / observații (text liber)
                              <input
                                value={pickNote}
                                maxLength={200}
                                onChange={(e) => setPickNote(e.target.value)}
                                className={inputClass}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={addPicked}
                              disabled={!canAdd}
                              className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-salamander-600 disabled:opacity-50"
                            >
                              Adaugă
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <dl className="flex flex-col gap-1 rounded-lg border border-cream-200 p-4">
                    <div className="flex justify-between">
                      <dt>Produse</dt>
                      <dd>{money(totals.subtotal)}</dd>
                    </div>
                    {order.deliveryMethod !== "PICKUP" && (
                      <div className="flex justify-between">
                        <dt>Transport</dt>
                        <dd>
                          {totals.shippingCents === 0
                            ? "gratuit"
                            : money(totals.shippingCents)}
                        </dd>
                      </div>
                    )}
                    {order.discountCode && (
                      <div className="flex justify-between text-xs text-taupe-500">
                        <dt>Cod {order.discountCode}</dt>
                        <dd>rămâne aplicat</dd>
                      </div>
                    )}
                    {totals.codFeeCents > 0 && (
                      <div className="flex justify-between">
                        <dt>Taxă ramburs</dt>
                        <dd>{money(totals.codFeeCents)}</dd>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t border-cream-200 pt-2 text-base font-semibold text-taupe-800">
                      <dt>Total nou</dt>
                      <dd>{money(totals.totalCents)}</dd>
                    </div>
                    {totals.totalCents !== order.totalCents && (
                      <div className="text-xs text-taupe-500">
                        Înainte: {money(order.totalCents)}
                      </div>
                    )}
                    {order.paidCents !== null && diff !== 0 && changedSomething && (
                      <p
                        className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${diff < 0 ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}
                      >
                        {diff < 0
                          ? `Clientul a plătit ${money(order.paidCents)} cu cardul. După modificare trebuie să-i rambursezi ${money(-diff)} (din Netopia, la Comenzi).`
                          : `Clientul a plătit ${money(order.paidCents)} cu cardul. După modificare mai are de plătit ${money(diff)} (de exemplu ramburs sau o plată separată).`}
                      </p>
                    )}
                    {order.paymentMethod === "COD" && (
                      <p className="mt-2 text-xs text-taupe-500">
                        Comandă cu ramburs: clientul plătește {money(totals.totalCents)} curierului.
                      </p>
                    )}
                  </dl>

                  <div className="flex flex-col gap-3 rounded-lg border border-cream-200 p-4">
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-taupe-700">
                      Parola ta de admin (confirmă modificarea)
                      <input
                        type="password"
                        value={password}
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} max-w-xs`}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={notify}
                        onChange={(e) => setNotify(e.target.checked)}
                      />
                      Trimite clientului un email cu comanda modificată
                    </label>
                    {empty && (
                      <p className="text-xs font-medium text-red-600">
                        Comanda trebuie să rămână cu cel puțin un produs. Pentru a o
                        desființa, folosește „Anulează comanda”.
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={save}
                        disabled={
                          pending ||
                          !valid ||
                          empty ||
                          !changedSomething ||
                          password.length === 0
                        }
                        className="w-fit rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 hover:bg-salamander-600 disabled:opacity-50"
                      >
                        {pending ? "Se salvează..." : "Salvează modificările"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onClose()}
                        className="text-sm text-taupe-500 hover:underline"
                      >
                        Închide
                      </button>
                    </div>
                  </div>
                </>
              )}

              {result && (
                <p
                  role={result.ok ? "status" : "alert"}
                  className={`rounded-lg px-4 py-3 ${result.ok ? "bg-green-50 text-green-800" : "border border-red-200 bg-red-50 text-red-700"}`}
                >
                  {result.message}
                </p>
              )}

              <div>
                <h3 className="mb-2 font-semibold text-taupe-800">
                  Modificări anterioare
                </h3>
                {order.changes.length === 0 ? (
                  <p className="text-xs text-taupe-500">
                    Comanda nu a fost modificată până acum.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {order.changes.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-cream-200 px-3 py-2 text-xs"
                      >
                        <div className="text-taupe-500">
                          {c.at} · {c.username} · total {money(c.oldTotalCents)} →{" "}
                          {money(c.newTotalCents)}
                        </div>
                        <div className="mt-0.5 text-taupe-800">{c.summary}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
