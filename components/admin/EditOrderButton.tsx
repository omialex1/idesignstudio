"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editOrderAction, getEditCatalogAction } from "@/lib/admin/order-actions";
import type { CatalogProduct, EditLine } from "@/lib/orders/edit";
import { orderCharges } from "@/lib/shipping";
import { formatPrice } from "@/lib/format";
import { swatchStyle } from "@/lib/colors-shared";
import { ALL_COMPONENTS_ID, DEFAULT_COMPONENT_ID } from "@/lib/colors";

export type ItemColor = {
  name: string;
  // the piece it belongs to ("Capac"), when the product has several
  piece: string | null;
  hex: string;
  swatchUrl: string | null;
};

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
    // short title, for example "Săpunieră SOAPIS"
    title: string;
    variant: string | null;
    colors: ItemColor[];
    note: string | null;
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
  title: string;
  variantId: string | null;
  variantName: string | null;
  colors: ItemColor[];
  colorChoices: { componentId: string; colors: string[] }[];
  quantity: string;
  price: string;
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

// A round colour sample: the texture photo when there is one, else the colour.
function Swatch({
  hex,
  swatchUrl,
  size = 18,
}: {
  hex: string;
  swatchUrl: string | null;
  size?: number;
}) {
  if (swatchUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={swatchUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-black/10 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full border border-black/10"
      style={{ width: size, height: size, ...swatchStyle(hex) }}
    />
  );
}

function ColorChips({ colors }: { colors: ItemColor[] }) {
  if (colors.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {colors.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-xs text-taupe-600">
          <Swatch hex={c.hex} swatchUrl={c.swatchUrl} />
          {c.piece ? `${c.piece}: ` : ""}
          {c.name}
        </span>
      ))}
    </span>
  );
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
  const [catalogError, setCatalogError] = useState(false);

  function openDialog() {
    setOpen(true);
    if (!blockReason && !catalog) {
      getEditCatalogAction()
        .then(setCatalog)
        .catch(() => {
          setCatalog([]);
          setCatalogError(true);
        });
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
          catalogError={catalogError}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function EditOrderDialog({
  order,
  blockReason,
  catalog,
  catalogError,
  onClose,
}: {
  order: EditableOrderView;
  blockReason: string | null;
  catalog: CatalogProduct[] | null;
  catalogError: boolean;
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
  const [openChange, setOpenChange] = useState<string | null>(null);

  // the "add a product" form
  const [search, setSearch] = useState("");
  const [pickId, setPickId] = useState("");
  const [pickVariant, setPickVariant] = useState("");
  const [pickColors, setPickColors] = useState<Record<string, string>>({});
  const [wholeSet, setWholeSet] = useState(false);
  const [pickQty, setPickQty] = useState("1");
  const [pickPrice, setPickPrice] = useState("");

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
  const setQty = (id: string, q: number) =>
    setQuantities((s) => ({ ...s, [id]: String(Math.max(0, Math.min(999, q))) }));

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

  // the changes to be saved, as a table
  const pendingRows: { kind: string; tone: string; title: string; detail: string; deltaCents: number }[] = [];
  for (const i of order.items) {
    const q = lineQty(i.id);
    if (q === null || q === i.quantity) continue;
    pendingRows.push(
      q === 0
        ? { kind: "Scos", tone: "text-red-700 bg-red-50", title: i.title, detail: `${i.quantity} buc. → scos`, deltaCents: -i.unitPriceCents * i.quantity }
        : { kind: "Cantitate", tone: "text-amber-800 bg-amber-50", title: i.title, detail: `${i.quantity} → ${q} buc.`, deltaCents: i.unitPriceCents * (q - i.quantity) },
    );
  }
  for (const { a, qty, cents } of additionRows) {
    pendingRows.push({
      kind: "Adăugat",
      tone: "text-green-800 bg-green-50",
      title: a.title,
      detail: `${qty ?? "?"} buc. × ${cents !== null ? money(cents) : "?"}`,
      deltaCents: (cents ?? 0) * (qty ?? 0),
    });
  }

  // ---- the add form
  const needle = search.trim().toLowerCase();
  const matches = (catalog ?? [])
    .filter((p) => !needle || p.name.toLowerCase().includes(needle))
    .slice(0, 8);
  const picked = (catalog ?? []).find((p) => p.id === pickId) ?? null;
  const pickedVariant = picked?.variants.find((v) => v.id === pickVariant) ?? null;
  const needsVariant = !!picked && picked.variants.length > 0;
  const pieces = pickedVariant ? pickedVariant.pieces : (picked?.pieces ?? []);
  const slots = picked && picked.colors.length > 0
    ? pieces.length > 0
      ? pieces
      : [{ id: DEFAULT_COMPONENT_ID, name: null as string | null }]
    : [];
  const sitePrice = pickedVariant
    ? pickedVariant
    : picked && !needsVariant
      ? picked
      : null;
  const colorsComplete =
    slots.length === 0 ||
    (wholeSet && slots.length >= 2
      ? !!pickColors[ALL_COMPONENTS_ID]
      : slots.every((s) => !!pickColors[s.id]));
  const canAdd =
    !!picked &&
    (!needsVariant || !!pickedVariant) &&
    colorsComplete &&
    (toQuantity(pickQty) ?? 0) > 0 &&
    toCents(pickPrice) !== null;

  function choose(id: string) {
    setPickId(id);
    setPickVariant("");
    setPickColors({});
    setWholeSet(false);
    const p = (catalog ?? []).find((x) => x.id === id);
    setPickPrice(p && p.variants.length === 0 ? (p.priceCents / 100).toFixed(2) : "");
  }
  function chooseVariant(id: string) {
    setPickVariant(id);
    setPickColors({});
    setWholeSet(false);
    const v = picked?.variants.find((x) => x.id === id);
    if (v) setPickPrice((v.priceCents / 100).toFixed(2));
  }

  function addPicked() {
    if (!picked || !canAdd) return;
    const byId = new Map(picked.colors.map((c) => [c.id, c]));
    const colorChoices =
      slots.length === 0
        ? []
        : wholeSet && slots.length >= 2
          ? [{ componentId: ALL_COMPONENTS_ID, colors: [pickColors[ALL_COMPONENTS_ID]] }]
          : slots.map((s) => ({ componentId: s.id, colors: [pickColors[s.id]] }));
    const chips: ItemColor[] = colorChoices.map((choice) => {
      const color = byId.get(choice.colors[0]);
      const slot = slots.find((s) => s.id === choice.componentId);
      return {
        name: color?.name ?? choice.colors[0],
        piece: choice.componentId === ALL_COMPONENTS_ID ? "Tot setul" : (slot?.name ?? null),
        hex: color?.hex ?? "#CCCCCC",
        swatchUrl: color?.swatchUrl ?? null,
      };
    });
    setAdditions((list) => [
      ...list,
      {
        key: Date.now() + list.length,
        productId: picked.id,
        title: picked.name,
        variantId: pickedVariant?.id ?? null,
        variantName: pickedVariant?.name ?? null,
        colors: chips,
        colorChoices,
        quantity: pickQty,
        price: pickPrice,
      },
    ]);
    setPickId("");
    setPickVariant("");
    setPickColors({});
    setWholeSet(false);
    setPickQty("1");
    setPickPrice("");
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
        colorChoices: a.colorChoices,
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

  const stepBtn =
    "flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold leading-none text-white shadow-sm transition-transform active:scale-95 disabled:opacity-40";

  return (
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
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm hover:bg-white/10"
            aria-label="Închide"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6 text-sm text-taupe-700">
          {blockReason ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
            >
              {blockReason}
            </p>
          ) : (
            <>
              {/* the products of the order */}
              <section>
                <h3 className="mb-2 text-base font-semibold text-taupe-800">
                  Produse în comandă
                </h3>
                <ul className="flex flex-col gap-2">
                  {order.items.map((i) => {
                    const q = lineQty(i.id);
                    const removed = q === 0;
                    const changed = q !== null && q !== i.quantity;
                    return (
                      <li
                        key={i.id}
                        className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 ${
                          removed
                            ? "border-red-300 bg-red-50"
                            : changed
                              ? "border-amber-400 bg-amber-50"
                              : "border-cream-200 bg-white"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-base font-semibold text-taupe-900 ${removed ? "line-through opacity-60" : ""}`}
                          >
                            {i.title}
                            {i.variant && (
                              <span className="ml-2 text-sm font-normal text-taupe-600">
                                {i.variant}
                              </span>
                            )}
                          </div>
                          <ColorChips colors={i.colors} />
                          {i.note && (
                            <div className="text-xs text-taupe-500">{i.note}</div>
                          )}
                          <div className="mt-0.5 text-xs text-taupe-500">
                            Preț: {money(i.unitPriceCents)} / buc.
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Scade cantitatea"
                            onClick={() => setQty(i.id, (q ?? 0) - 1)}
                            disabled={q === 0}
                            className={`${stepBtn} bg-red-500 hover:bg-red-600`}
                          >
                            −
                          </button>
                          <input
                            inputMode="numeric"
                            value={quantities[i.id] ?? ""}
                            onChange={(e) =>
                              setQuantities((s) => ({
                                ...s,
                                [i.id]: e.target.value.replace(/\D/g, ""),
                              }))
                            }
                            aria-label="Cantitate"
                            aria-invalid={q === null}
                            className={`${inputClass} w-16 text-center text-base font-semibold`}
                          />
                          <button
                            type="button"
                            aria-label="Crește cantitatea"
                            onClick={() => setQty(i.id, (q ?? 0) + 1)}
                            className={`${stepBtn} bg-green-600 hover:bg-green-700`}
                          >
                            +
                          </button>
                        </div>
                        <div className="w-24 text-right text-base font-semibold text-taupe-900">
                          {money(i.unitPriceCents * (q ?? 0))}
                        </div>
                      </li>
                    );
                  })}
                  {additionRows.map(({ a, qty, cents }) => (
                    <li
                      key={a.key}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-green-400 bg-green-50 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-semibold text-taupe-900">
                          <span className="mr-2 rounded bg-green-200 px-1.5 py-0.5 text-xs font-semibold text-green-900">
                            ADĂUGAT
                          </span>
                          {a.title}
                          {a.variantName && (
                            <span className="ml-2 text-sm font-normal text-taupe-600">
                              {a.variantName}
                            </span>
                          )}
                        </div>
                        <ColorChips colors={a.colors} />
                        <div className="mt-0.5 text-xs text-taupe-500">
                          Preț: {cents !== null ? money(cents) : "invalid"} / buc. ×{" "}
                          {qty ?? "?"} buc.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAdditions((list) => list.filter((x) => x.key !== a.key))
                        }
                        className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Elimină
                      </button>
                      <div className="w-24 text-right text-base font-semibold text-taupe-900">
                        {money((cents ?? 0) * (qty ?? 0))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* add a product */}
              <section className="rounded-xl border border-cream-300 bg-cream-50 p-4">
                <h3 className="mb-3 text-base font-semibold text-taupe-800">
                  Adaugă un produs
                </h3>
                {catalog === null ? (
                  <p className="text-xs text-taupe-500">Se încarcă produsele…</p>
                ) : catalogError || catalog.length === 0 ? (
                  <p className="text-xs font-medium text-red-600">
                    Nu am putut încărca produsele. Închide fereastra, reîncarcă pagina și
                    încearcă din nou.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div>
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="1. Caută produsul după nume"
                        className={`${inputClass} w-full`}
                      />
                      <ul className="mt-2 flex flex-col gap-1">
                        {matches.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => choose(p.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left ${
                                p.id === pickId
                                  ? "border-salamander-500 bg-white font-semibold text-taupe-900"
                                  : "border-cream-200 bg-white hover:bg-cream-100"
                              }`}
                            >
                              <span>{p.name}</span>
                              <span className="text-xs text-taupe-500">
                                {p.variants.length > 0 ? "de la " : ""}
                                {money(
                                  p.variants.length > 0
                                    ? Math.min(...p.variants.map((v) => v.priceCents))
                                    : p.priceCents,
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                        {matches.length === 0 && (
                          <li className="text-xs text-taupe-500">Niciun produs găsit.</li>
                        )}
                      </ul>
                    </div>

                    {picked && (
                      <div className="flex flex-col gap-4 rounded-lg border border-cream-200 bg-white p-4">
                        <div className="text-base font-semibold text-taupe-900">
                          {picked.name}
                        </div>

                        {needsVariant && (
                          <div>
                            <div className="mb-1.5 text-xs font-medium text-taupe-700">
                              2. Varianta
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {picked.variants.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => chooseVariant(v.id)}
                                  className={`rounded-full border px-4 py-1.5 text-sm ${
                                    v.id === pickVariant
                                      ? "border-salamander-500 bg-salamander-50 font-semibold text-salamander-700"
                                      : "border-cream-300 hover:bg-cream-100"
                                  }`}
                                >
                                  {v.name} · {money(v.priceCents)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!needsVariant || pickedVariant) && slots.length > 0 && (
                          <div className="flex flex-col gap-3">
                            {slots.length >= 2 && (
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={wholeSet}
                                  onChange={(e) => {
                                    setWholeSet(e.target.checked);
                                    setPickColors({});
                                  }}
                                />
                                Aceeași culoare pentru tot setul
                              </label>
                            )}
                            {(wholeSet && slots.length >= 2
                              ? [{ id: ALL_COMPONENTS_ID, name: "Tot setul" as string | null }]
                              : slots
                            ).map((slot) => {
                              const chosen = picked.colors.find(
                                (c) => c.id === pickColors[slot.id],
                              );
                              return (
                                <div key={slot.id}>
                                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-taupe-700">
                                    <span>
                                      {needsVariant ? "3." : "2."} Culoarea
                                      {slot.name ? ` · ${slot.name}` : ""}
                                    </span>
                                    {chosen && (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-2.5 py-0.5 text-taupe-800">
                                        <Swatch hex={chosen.hex} swatchUrl={chosen.swatchUrl} size={14} />
                                        {chosen.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {picked.colors.map((c) => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        title={c.name}
                                        aria-label={c.name}
                                        aria-pressed={pickColors[slot.id] === c.id}
                                        onClick={() =>
                                          setPickColors((s) => ({ ...s, [slot.id]: c.id }))
                                        }
                                        className={`rounded-full p-0.5 ${
                                          pickColors[slot.id] === c.id
                                            ? "ring-2 ring-salamander-500 ring-offset-2"
                                            : "ring-1 ring-black/10 hover:ring-taupe-400"
                                        }`}
                                      >
                                        <Swatch hex={c.hex} swatchUrl={c.swatchUrl} size={30} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {(!needsVariant || pickedVariant) && (
                          <div className="flex flex-wrap items-end gap-4">
                            <label className="flex flex-col gap-1 text-xs font-medium">
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
                            <label className="flex flex-col gap-1 text-xs font-medium">
                              Preț / buc. (lei)
                              <input
                                inputMode="decimal"
                                value={pickPrice}
                                onChange={(e) => setPickPrice(e.target.value)}
                                className={`${inputClass} w-28`}
                              />
                            </label>
                            {sitePrice && (
                              <p className="max-w-xs text-xs text-taupe-500">
                                Preț pe site: <strong>{money(sitePrice.priceCents)}</strong>
                                {sitePrice.fullPriceCents !== null && (
                                  <>
                                    {" "}
                                    (cu promoția{picked.promoLabel ? ` ${picked.promoLabel}` : ""};
                                    fără promoție {money(sitePrice.fullPriceCents)})
                                  </>
                                )}
                                . Îl poți schimba.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={addPicked}
                              disabled={!canAdd}
                              className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 hover:bg-salamander-600 disabled:opacity-50"
                            >
                              Adaugă în comandă
                            </button>
                          </div>
                        )}
                        {!canAdd && (!needsVariant || pickedVariant) && !colorsComplete && (
                          <p className="text-xs text-taupe-500">
                            Alege culoarea (sau culorile) ca să poți adăuga produsul.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* the changes to be saved */}
              {pendingRows.length > 0 && (
                <section>
                  <h3 className="mb-2 text-base font-semibold text-taupe-800">
                    Modificări de salvat
                  </h3>
                  <table className="w-full overflow-hidden rounded-lg border border-cream-200 text-left text-sm">
                    <thead className="bg-cream-100 text-xs text-taupe-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Ce</th>
                        <th className="px-3 py-2 font-medium">Produs</th>
                        <th className="px-3 py-2 font-medium">Detalii</th>
                        <th className="px-3 py-2 text-right font-medium">Diferență</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRows.map((r, idx) => (
                        <tr key={idx} className="border-t border-cream-200">
                          <td className="px-3 py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${r.tone}`}>
                              {r.kind}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium text-taupe-800">{r.title}</td>
                          <td className="px-3 py-2 text-taupe-600">{r.detail}</td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${r.deltaCents < 0 ? "text-red-600" : "text-green-700"}`}
                          >
                            {r.deltaCents > 0 ? "+" : "−"}
                            {money(Math.abs(r.deltaCents))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <dl className="flex flex-col gap-1 rounded-xl border border-cream-200 p-4">
                <div className="flex justify-between">
                  <dt>Produse</dt>
                  <dd>{money(totals.subtotal)}</dd>
                </div>
                {order.deliveryMethod !== "PICKUP" && (
                  <div className="flex justify-between">
                    <dt>Transport</dt>
                    <dd>
                      {totals.shippingCents === 0 ? "gratuit" : money(totals.shippingCents)}
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
                <div className="mt-1 flex justify-between border-t border-cream-200 pt-2 text-lg font-semibold text-taupe-900">
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

              <section className="flex flex-col gap-3 rounded-xl border border-cream-200 p-4">
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
                    Comanda trebuie să rămână cu cel puțin un produs. Pentru a o desființa,
                    folosește „Anulează comanda”.
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
                    onClick={onClose}
                    className="text-sm text-taupe-500 hover:underline"
                  >
                    Închide
                  </button>
                </div>
                {!changedSomething && (
                  <p className="text-xs text-taupe-500">
                    Butonul se activează după ce schimbi ceva și scrii parola.
                  </p>
                )}
              </section>
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

          <section>
            <h3 className="mb-2 text-base font-semibold text-taupe-800">
              Modificări anterioare
            </h3>
            {order.changes.length === 0 ? (
              <p className="text-xs text-taupe-500">
                Comanda nu a fost modificată până acum.
              </p>
            ) : (
              <table className="w-full overflow-hidden rounded-lg border border-cream-200 text-left text-xs">
                <thead className="bg-cream-100 text-taupe-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Când</th>
                    <th className="px-3 py-2 font-medium">Cine</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {order.changes.map((c) => (
                    <>
                      <tr
                        key={c.id}
                        onClick={() => setOpenChange(openChange === c.id ? null : c.id)}
                        className="cursor-pointer border-t border-cream-200 hover:bg-cream-50"
                      >
                        <td className="px-3 py-2 text-taupe-700">{c.at}</td>
                        <td className="px-3 py-2 text-taupe-700">{c.username}</td>
                        <td className="px-3 py-2 text-taupe-800">
                          {money(c.oldTotalCents)} → {money(c.newTotalCents)}
                        </td>
                        <td className="px-3 py-2 text-right text-salamander-600">
                          {openChange === c.id ? "Ascunde" : "Detalii"}
                        </td>
                      </tr>
                      {openChange === c.id && (
                        <tr key={`${c.id}-d`} className="border-t border-cream-100 bg-cream-50">
                          <td colSpan={4} className="px-3 py-2 text-taupe-800">
                            {c.summary}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
