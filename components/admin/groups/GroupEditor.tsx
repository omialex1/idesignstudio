"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GroupProduct } from "@/lib/admin/groups";
import type { GroupTypeRow } from "@/lib/admin/group-types";
import AdminCard from "@/components/admin/AdminCard";
import GroupNameField from "@/components/admin/groups/GroupNameField";
import { controlClass } from "@/components/admin/FormBits";
import {
  DiscountCell,
  Info,
  ProductName,
  ProductPhoto,
  Thumb,
  btn,
  btnDanger,
  btnMain,
  fromLocalInput,
  money,
  periodStatus,
  toLocalInput,
  type CategoryHit,
  type Editor,
} from "@/components/admin/groups/parts";

// What the server gives for a group that already exists (see getGroup).
export type GroupData = {
  id: string;
  name: string;
  type: { id: string };
  discountPercent: number | null;
  shuffle: boolean;
  discountLive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxItems: number | null;
  items: GroupProduct[];
};

// The page of one group (or of a new one): its settings, its discount and its products.
export default function GroupEditor({
  types,
  group,
  newTypeId,
  withProduct,
  justSaved = false,
}: {
  types: GroupTypeRow[];
  group: GroupData | null;
  // for a new group: the kind chosen, and a product that is already in it
  newTypeId?: string;
  withProduct?: GroupProduct | null;
  justSaved?: boolean;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>(() =>
    group
      ? {
          id: group.id,
          name: group.name,
          typeId: group.type.id,
          discount: group.discountPercent ? String(group.discountPercent) : "",
          shuffle: group.shuffle === true,
          discountLive: group.discountLive === true,
          periodOn: !!(group.startsAt || group.endsAt),
          startsAt: toLocalInput(group.startsAt),
          endsAt: toLocalInput(group.endsAt),
          choices: {},
          maxItems: group.maxItems ? String(group.maxItems) : "",
          items: group.items,
        }
      : {
          id: null,
          name: "",
          typeId: newTypeId ?? types[0]?.id ?? "",
          discount: "",
          shuffle: false,
          discountLive: false,
          periodOn: false,
          startsAt: "",
          endsAt: "",
          choices: {},
          maxItems: "",
          items: withProduct ? [withProduct] : [],
        },
  );
  const snapshot = (e: Editor) =>
    JSON.stringify([
      e.name,
      e.typeId,
      e.discount,
      e.shuffle,
      e.discountLive,
      e.periodOn,
      e.startsAt,
      e.endsAt,
      e.choices,
      e.maxItems,
      e.items.map((i) => [i.id, i.live]),
    ]);
  // a new group with nothing typed is not "unsaved changes"; it is saved once created
  const [saved, setSaved] = useState(() => snapshot(editor));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    justSaved ? { ok: true, text: "Grup creat și salvat." } : null,
  );
  const [busy, setBusy] = useState(false);

  // search
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{
    products: GroupProduct[];
    categories: CategoryHit[];
  } | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const searchSeq = useRef(0);
  const dragId = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const dirty = snapshot(editor) !== saved;

  // leaving the page (closing the tab, reload) with unsaved changes asks first
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  // search while typing
  useEffect(() => {
    const text = query.trim();
    if (text.length < 1) return;
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/admin/groups/search?q=${encodeURIComponent(text)}`,
      ).catch(() => null);
      if (seq !== searchSeq.current || !res?.ok) return;
      setHits(await res.json());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const update = (patch: Partial<Editor>) =>
    setEditor((e) => ({ ...e, ...patch }));

  const maxItems =
    editor && /^\d+$/.test(editor.maxItems) && Number(editor.maxItems) > 0
      ? Number(editor.maxItems)
      : null;
  const currentType = types.find((t) => t.id === editor?.typeId);
  const conflictCount = editor
    ? editor.items.filter((i) => !i.tiered && i.otherDiscounts.length > 0)
        .length
    : 0;
  const discountNumber =
    /^\d+$/.test(editor?.discount ?? "") &&
    Number(editor?.discount) >= 1 &&
    Number(editor?.discount) <= 100
      ? Number(editor?.discount)
      : null;

  function attach(products: GroupProduct[]) {
    if (!editor) return;
    const have = new Set(editor.items.map((i) => i.id));
    const fresh = products.filter((p) => !have.has(p.id));
    const room =
      maxItems === null
        ? fresh.length
        : Math.max(0, maxItems - editor.items.length);
    if (fresh.length > room) {
      setMessage({
        ok: false,
        text: `Maximum ${maxItems} produse în grup. Am adăugat doar ${room}.`,
      });
    } else {
      setMessage(null);
    }
    const added = fresh.slice(0, room);
    update({ items: [...editor.items, ...added] });
    if (currentType?.hasDiscount) loadConflicts(added);
  }

  // products that are already in another group with a discount: shown with a
  // warning, so the discount that applies can be chosen
  async function loadConflicts(list: GroupProduct[]) {
    if (list.length === 0) return;
    const ids = list.map((p) => p.id);
    const res = await fetch(
      `/api/admin/groups/search?conflicts=${ids.join(",")}&exclude=${editor?.id ?? ""}`,
    ).catch(() => null);
    if (!res?.ok) return;
    const data: {
      others: Record<string, GroupProduct["otherDiscounts"]>;
      chosen: Record<string, string | null>;
    } = await res.json();
    setEditor((e) =>
      e
        ? {
            ...e,
            items: e.items.map((i) =>
              ids.includes(i.id)
                ? {
                    ...i,
                    otherDiscounts: data.others[i.id] ?? [],
                    chosenGroupId: data.chosen[i.id] ?? null,
                  }
                : i,
            ),
          }
        : e,
    );
  }

  async function attachCategory(c: CategoryHit) {
    const res = await fetch(
      `/api/admin/groups/search?${c.kind === "main" ? "main" : "sub"}=${c.id}`,
    ).catch(() => null);
    if (!res?.ok) {
      setMessage({ ok: false, text: "Nu am putut citi produsele categoriei." });
      return;
    }
    attach((await res.json()).products);
  }

  function remove(id: string) {
    if (!editor) return;
    update({ items: editor.items.filter((i) => i.id !== id) });
    setChecked((list) => list.filter((c) => c !== id));
  }

  function drop(targetId: string) {
    if (!editor || !dragId.current) return;
    const from = editor.items.findIndex((i) => i.id === dragId.current);
    const to = editor.items.findIndex((i) => i.id === targetId);
    dragId.current = null;
    setOverId(null);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...editor.items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    update({ items: next });
  }

  async function save() {
    if (!editor) return;
    if (!editor.name.trim()) {
      setMessage({ ok: false, text: "Scrie un nume pentru grup." });
      return;
    }
    if (
      currentType?.hasDiscount &&
      editor.discount &&
      discountNumber === null
    ) {
      setMessage({
        ok: false,
        text: "Discountul trebuie să fie între 1 și 100%.",
      });
      return;
    }
    const startsAt = editor.periodOn ? fromLocalInput(editor.startsAt) : null;
    const endsAt = editor.periodOn ? fromLocalInput(editor.endsAt) : null;
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setMessage({
        ok: false,
        text: "Sfârșitul perioadei trebuie să fie după început.",
      });
      return;
    }
    if (
      currentType?.hasDiscount &&
      editor.discountLive &&
      discountNumber === null
    ) {
      setMessage({
        ok: false,
        text: "Alege un discount înainte să-l aplici pe site.",
      });
      return;
    }
    setBusy(true);
    setMessage(null);
    const body = JSON.stringify({
      name: editor.name,
      typeId: editor.typeId,
      discountPercent: currentType?.hasDiscount ? discountNumber : null,
      discountLive: currentType?.hasDiscount === true && editor.discountLive,
      startsAt,
      endsAt,
      itemLive: Object.fromEntries(
        editor.items.filter((i) => i.live !== null).map((i) => [i.id, i.live]),
      ),
      choices: editor.choices,
      shuffle: editor.shuffle,
      maxItems: maxItems,
      productIds: editor.items.map((i) => i.id),
    });
    const res = await fetch(
      editor.id ? `/api/admin/groups/${editor.id}` : "/api/admin/groups",
      {
        method: editor.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
    ).catch(() => null);
    setBusy(false);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setMessage({
        ok: false,
        text:
          data?.error === "max"
            ? "Sunt mai multe produse decât maximul grupului."
            : "Nu am putut salva grupul. Încearcă din nou.",
      });
      return;
    }
    const id = editor.id ?? data.id;
    const next = {
      ...editor,
      id,
      discount:
        currentType?.hasDiscount && discountNumber
          ? String(discountNumber)
          : "",
      discountLive: currentType?.hasDiscount === true && editor.discountLive,
      choices: {},
      // the choices just saved are now the products' own
      items: editor.items.map((i) =>
        i.id in editor.choices
          ? {
              ...i,
              chosenGroupId:
                editor.choices[i.id] === "self" ? id : editor.choices[i.id],
            }
          : i,
      ),
    };
    setEditor(next);
    setSaved(snapshot(next));
    setMessage({ ok: true, text: "Grup salvat." });
    if (!editor.id) router.replace(`/admin/groups/${id}?salvat=1`);
    else router.refresh();
  }

  async function removeGroup() {
    if (!editor.id) return;
    if (
      !window.confirm(
        `Ștergi grupul „${editor.name}”? Produsele rămân, doar grupul dispare.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/groups/${editor.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setMessage({ ok: false, text: "Nu am putut șterge grupul." });
      return;
    }
    // nothing left to protect once the group is gone
    setSaved(snapshot(editor));
    router.push("/admin/groups");
    router.refresh();
  }

  const have = new Set(editor.items.map((i) => i.id));
  const alphabetical = [...editor.items].sort((a, b) =>
    a.name.localeCompare(b.name, "ro"),
  );
  // results only count while something is typed
  const shown = query.trim() ? hits : null;
  const compared = (shown?.products ?? []).filter((p) =>
    checked.includes(p.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/groups"
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm(
                  "Ai modificări nesalvate. Părăsești pagina fără să salvezi?",
                )
              ) {
                e.preventDefault();
              }
            }}
            className="text-sm font-medium text-salamander-600 hover:underline"
          >
            ← Toate grupurile
          </Link>
          <h1 className="mt-1 font-display text-2xl text-taupe-800">
            {editor.id ? editor.name || "Grup" : "Grup nou"}
          </h1>
        </div>
        {editor.id && (
          <Link href={`/admin/products?grp=${editor.id}`} className={btn}>
            Arată produsele în lista de produse
          </Link>
        )}
      </div>

      <AdminCard title="General" bodyClassName="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <GroupNameField
            value={editor.name}
            onChange={(name) => update({ name })}
            onPick={attachCategory}
            suggest={!editor.id}
          />
          <div className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Tip de grup
            <div className="inline-flex flex-wrap overflow-hidden rounded-2xl border border-taupe-400">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    update({ typeId: t.id });
                    if (t.hasDiscount) loadConflicts(editor.items);
                  }}
                  className={`px-4 py-2 text-sm ${
                    editor.typeId === t.id
                      ? "bg-choc font-semibold text-white"
                      : "text-taupe-700 hover:bg-cream-100"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Maxim produse
            <input
              value={editor.maxItems}
              onChange={(e) =>
                update({
                  maxItems: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
              inputMode="numeric"
              placeholder="∞ fără limită"
              className={controlClass(false, "w-36")}
            />
          </label>
        </div>

        {currentType?.showOnSite && (
          <label className="flex items-start gap-2 text-sm text-taupe-700">
            <input
              type="checkbox"
              checked={editor.shuffle}
              onChange={(e) => update({ shuffle: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-salamander-500"
            />
            <span>
              <b>Ordine aleatorie pe site</b>
              <span className="block text-xs text-taupe-500">
                Produsele din grup apar într-o altă ordine la fiecare vizită.
                Fără bifă, apar în ordinea de mai jos.
              </span>
            </span>
          </label>
        )}
      </AdminCard>

      {currentType?.hasDiscount && (
        <AdminCard title="Discount" bodyClassName="flex flex-col gap-5 p-6">
          {currentType?.hasDiscount && (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <span className="text-sm font-semibold text-taupe-800">
                Discount pentru produsele din grup
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={discountNumber === n}
                    onClick={() =>
                      update({
                        discount: discountNumber === n ? "" : String(n),
                      })
                    }
                    className={`rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                      discountNumber === n
                        ? "border-choc bg-choc text-white"
                        : "border-cream-300 bg-white text-taupe-700 hover:bg-cream-100"
                    }`}
                  >
                    {n}%
                  </button>
                ))}
                <label className="ml-2 flex items-center gap-2 text-sm text-taupe-700">
                  sau scrie
                  <input
                    value={editor.discount}
                    onChange={(e) =>
                      update({
                        discount: e.target.value.replace(/\D/g, "").slice(0, 3),
                      })
                    }
                    inputMode="numeric"
                    placeholder="ex. 15"
                    aria-label="Discount în procente"
                    className={controlClass(false, "w-20")}
                  />
                  %
                </label>
              </div>
              <label className="flex items-start gap-2 border-t border-amber-200 pt-3 text-sm text-taupe-800">
                <input
                  type="checkbox"
                  checked={editor.discountLive}
                  onChange={(e) => update({ discountLive: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-salamander-500"
                />
                <span>
                  <b>Aplică pe site</b>
                  <span className="block text-xs text-taupe-600">
                    Bifat și salvat: produsele din grup se vând la prețul redus
                    pe site, în coș, la plată și pe factură. Nebifat: discountul
                    e doar salvat, prețurile nu se schimbă. Poți porni sau opri
                    discountul și pentru un singur produs, în tabelul de mai
                    jos.
                  </span>
                </span>
              </label>
              <div className="flex flex-col gap-2 text-sm text-taupe-800">
                <span className="font-semibold">Perioadă</span>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="period"
                    checked={!editor.periodOn}
                    onChange={() => update({ periodOn: false })}
                    className="h-4 w-4 accent-salamander-500"
                  />
                  Nedeterminată (rămâne activ până îl oprești tu)
                </label>
                <label className="flex flex-wrap items-center gap-2">
                  <input
                    type="radio"
                    name="period"
                    checked={editor.periodOn}
                    onChange={() => update({ periodOn: true })}
                    className="h-4 w-4 accent-salamander-500"
                  />
                  Între
                  <input
                    type="datetime-local"
                    value={editor.startsAt}
                    onChange={(e) =>
                      update({ startsAt: e.target.value, periodOn: true })
                    }
                    aria-label="Începutul perioadei"
                    className={controlClass(false, "w-52")}
                  />
                  și
                  <input
                    type="datetime-local"
                    value={editor.endsAt}
                    onChange={(e) =>
                      update({ endsAt: e.target.value, periodOn: true })
                    }
                    aria-label="Sfârșitul perioadei"
                    className={controlClass(false, "w-52")}
                  />
                </label>
                <p className="text-xs text-taupe-600">{periodStatus(editor)}</p>
              </div>
              {conflictCount > 0 && (
                <p
                  role="status"
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900"
                >
                  ⚠ {conflictCount}{" "}
                  {conflictCount === 1
                    ? "produs e și într-un alt grup"
                    : "produse sunt și în alte grupuri"}{" "}
                  cu discount. Un produs primește un singur discount: în tabelul
                  de mai jos alegi care se aplică (implicit, cel mai mare).
                </p>
              )}
            </div>
          )}
        </AdminCard>
      )}

      <AdminCard
        title="Produse din grup"
        bodyClassName="flex flex-col gap-5 p-6"
      >
        <div>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setComparing(false);
            }}
            placeholder="Caută produs, categorie sau subcategorie…"
            aria-label="Caută produs, categorie sau subcategorie"
            className={controlClass(false, "w-full")}
          />
          {shown && (
            <div className="mt-2 overflow-visible rounded-xl border border-cream-300 shadow-md">
              {shown.categories.map((c) => (
                <div
                  key={`${c.kind}${c.id}`}
                  className="flex items-center gap-3 border-b border-cream-200 bg-cream-50 px-3 py-2 first:rounded-t-xl"
                >
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                    {c.kind === "main" ? "Categorie" : "Subcategorie"}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <b>{c.name}</b>
                    <span className="block text-xs text-taupe-500">
                      {c.count} produse active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => attachCategory(c)}
                    className={btnMain}
                  >
                    Adaugă toate ({c.count})
                  </button>
                </div>
              ))}
              {shown.products.length === 0 && shown.categories.length === 0 && (
                <p className="px-3 py-3 text-sm text-taupe-500">
                  Niciun rezultat.
                </p>
              )}
              {shown.products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border-b border-cream-200 px-3 py-2 last:border-b-0 hover:bg-cream-50"
                >
                  <input
                    type="checkbox"
                    checked={checked.includes(p.id)}
                    onChange={(e) =>
                      setChecked((list) =>
                        e.target.checked
                          ? [...list, p.id]
                          : list.filter((c) => c !== p.id),
                      )
                    }
                    aria-label={`Bifează ${p.name} pentru comparare`}
                    className="h-4 w-4 accent-salamander-500"
                  />
                  <Thumb url={p.imageUrl} />
                  <div className="min-w-0 flex-1 text-sm">
                    <b className="block truncate">
                      <ProductName product={p} />
                    </b>
                    <span className="text-xs text-taupe-500">
                      Stoc: {p.stock} · {money(p.priceCents)}
                      {!p.isActive && " · ascuns pe site"}
                    </span>
                  </div>
                  <Info product={p} />
                  <button
                    type="button"
                    disabled={have.has(p.id)}
                    onClick={() => attach([p])}
                    className={have.has(p.id) ? btn : btnMain}
                  >
                    {have.has(p.id) ? "Atașat" : "Atașează"}
                  </button>
                </div>
              ))}
              {shown.products.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-b-xl border-t border-cream-300 bg-cream-50 px-3 py-2 text-sm">
                  <span>
                    {checked.length}{" "}
                    {checked.length === 1 ? "produs bifat" : "produse bifate"}
                  </span>
                  <button
                    type="button"
                    disabled={compared.length < 2}
                    onClick={() => setComparing((v) => !v)}
                    className={btn}
                  >
                    {comparing ? "Ascunde compararea" : "Compară"}
                  </button>
                  <span className="text-xs text-taupe-500">
                    Bifează 2 sau mai multe produse ca să le vezi unul lângă
                    altul.
                  </span>
                </div>
              )}
            </div>
          )}

          {comparing && compared.length >= 2 && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-cream-300">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream-50 text-xs text-taupe-500">
                  <tr>
                    <th className="w-24 px-3 py-2" />
                    {compared.map((p) => (
                      <th
                        key={p.id}
                        className="min-w-44 px-3 py-2 font-semibold text-taupe-800"
                      >
                        <ProductName product={p} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&_td]:border-t [&_td]:border-cream-200 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top">
                  <tr>
                    <td className="text-taupe-500">Poză</td>
                    {compared.map((p) => (
                      <td key={p.id}>
                        <Thumb url={p.imageUrl} className="h-16 w-16" />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-taupe-500">Subcategorie</td>
                    {compared.map((p) => (
                      <td key={p.id}>{p.categoryName}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-taupe-500">Preț</td>
                    {compared.map((p) => (
                      <td key={p.id}>{money(p.priceCents)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-taupe-500">Stoc</td>
                    {compared.map((p) => (
                      <td key={p.id}>{p.stock}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-taupe-500">Descriere</td>
                    {compared.map((p) => (
                      <td
                        key={p.id}
                        className="text-xs leading-snug whitespace-pre-line"
                      >
                        {p.longDescription || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td />
                    {compared.map((p) => (
                      <td key={p.id}>
                        <button
                          type="button"
                          disabled={have.has(p.id)}
                          onClick={() => attach([p])}
                          className={have.has(p.id) ? btn : btnMain}
                        >
                          {have.has(p.id) ? "Atașat" : "Atașează"}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-taupe-500">
            „Adaugă toate” pune produsele active de acum din categorie; după
            aceea le poți scoate pe cele care nu se potrivesc.
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-taupe-700">
            Produsele din grup, în ordine alfabetică ({editor.items.length}
            {maxItems ? ` din ${maxItems}` : ""})
          </h3>
          {editor.items.length === 0 ? (
            <p className="text-sm text-taupe-500">
              Niciun produs încă. Caută mai sus și atașează.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-cream-50 text-xs text-taupe-500">
                <tr>
                  <th className="px-3 py-2">Nr.</th>
                  <th className="px-1 py-2" />
                  <th className="px-3 py-2">Nume</th>
                  <th className="px-3 py-2">Stoc</th>
                  {currentType?.hasDiscount && (
                    <th className="px-3 py-2">Discount</th>
                  )}
                  <th className="px-1 py-2" />
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {alphabetical.map((p, index) => (
                  <tr key={p.id} className="border-t border-cream-200">
                    <td className="px-3 py-1.5 text-taupe-500">{index + 1}</td>
                    <td className="px-1 py-1.5">
                      <ProductPhoto product={p} />
                    </td>
                    <td className="px-3 py-1.5">
                      <ProductName product={p} stacked />
                    </td>
                    <td className="px-3 py-1.5">{p.stock}</td>
                    {currentType?.hasDiscount && (
                      <td className="px-3 py-1.5 align-top">
                        {p.tiered ? (
                          <span className="text-xs text-taupe-500">
                            Preț pe cantități: fără discount
                          </span>
                        ) : (
                          <DiscountCell
                            product={p}
                            groupId={editor.id}
                            groupPercent={discountNumber}
                            choice={editor.choices[p.id]}
                            onLive={(live) =>
                              update({
                                items: editor.items.map((i) =>
                                  i.id === p.id ? { ...i, live } : i,
                                ),
                              })
                            }
                            onChoice={(value) =>
                              update({
                                choices: { ...editor.choices, [p.id]: value },
                              })
                            }
                          />
                        )}
                      </td>
                    )}
                    <td className="px-1 py-1.5">
                      <Info product={p} />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        className={btnDanger}
                      >
                        Scoate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editor.items.length > 1 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-taupe-700">
              Ordinea pe site (în ordinea alegerii; trage un card peste altul ca
              s-o schimbi)
            </h3>
            <ul className="flex flex-wrap gap-2">
              {editor.items.map((p, index) => (
                <li
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    dragId.current = p.id;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", p.id);
                  }}
                  onDragOver={(e) => {
                    if (!dragId.current) return;
                    e.preventDefault();
                    setOverId(p.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    drop(p.id);
                  }}
                  onDragEnd={() => {
                    dragId.current = null;
                    setOverId(null);
                  }}
                  className={`relative w-24 cursor-grab rounded-xl border p-2 text-center text-[11px] leading-tight active:cursor-grabbing ${
                    overId === p.id
                      ? "border-salamander-500 bg-salamander-50"
                      : "border-cream-300"
                  }`}
                >
                  <span className="absolute top-1.5 left-1.5 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-choc text-[10px] text-white">
                    {index + 1}
                  </span>
                  <Thumb url={p.imageUrl} className="mb-1 h-12 w-full" />
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AdminCard>

      {/* the save bar stays in view while the page scrolls */}
      <div className="sticky bottom-0 z-20 -mx-8 -mb-8 flex flex-wrap items-center gap-3 border-t-2 border-choc bg-cream-100/95 px-8 py-3 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={busy || (!dirty && !!editor.id)}
          className={btnMain}
        >
          {busy
            ? "Se salvează…"
            : editor.id
              ? "Salvează grupul"
              : "Creează grupul"}
        </button>
        <Link
          href="/admin/groups"
          onClick={(e) => {
            if (
              dirty &&
              !window.confirm(
                "Ai modificări nesalvate. Părăsești pagina fără să salvezi?",
              )
            ) {
              e.preventDefault();
            }
          }}
          className={btn}
        >
          Anulează
        </Link>
        <span className="text-sm text-taupe-600" role="status">
          {message ? (
            <span
              className={
                message.ok
                  ? "font-medium text-green-700"
                  : "font-medium text-red-600"
              }
            >
              {message.text}
            </span>
          ) : dirty ? (
            "Ai modificări nesalvate."
          ) : null}
        </span>
        {editor.id && (
          <button
            type="button"
            onClick={removeGroup}
            disabled={busy}
            className={`${btnDanger} ml-auto`}
          >
            Șterge grupul
          </button>
        )}
      </div>
    </div>
  );
}
