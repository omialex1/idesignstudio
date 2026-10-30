"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupProduct, GroupSummary } from "@/lib/admin/groups";
import type { GroupTypeRow } from "@/lib/admin/group-types";
import {
  GROUPS_CHANGED_EVENT,
  OPEN_GROUPS_EVENT,
  type OpenGroupsDetail,
} from "@/components/admin/groups-events";
import { controlClass } from "@/components/admin/FormBits";
import TypeBadge from "@/components/admin/TypeBadge";

type CategoryHit = {
  id: string;
  kind: "main" | "sub";
  name: string;
  count: number;
};
type Editor = {
  // null while it is a new, unsaved group
  id: string | null;
  name: string;
  typeId: string;
  // 1..100 as typed ("" for none)
  discount: string;
  // a new random order on the site at every visit
  shuffle: boolean;
  maxItems: string;
  // in the order they were chosen
  items: GroupProduct[];
};

const money = (cents: number) =>
  `${(cents / 100).toFixed(2).replace(".", ",")} RON`;

const btn =
  "rounded-full border border-cream-300 bg-cream-100 px-4 py-1.5 text-sm font-semibold text-taupe-800 transition-colors hover:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-50";
const btnMain =
  "rounded-full bg-salamander-500 px-4 py-1.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:cursor-not-allowed disabled:opacity-50";
const btnDanger =
  "rounded-full border border-red-200 bg-white px-4 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50";

function Thumb({
  url,
  className = "h-9 w-9",
}: {
  url: string | null;
  className?: string;
}) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      draggable={false}
      className={`${className} shrink-0 rounded-lg object-cover`}
    />
  ) : (
    <span className={`${className} shrink-0 rounded-lg bg-cream-200`} />
  );
}

// The small circled "i": the description shows while the pointer is on it.
function Info({ product }: { product: GroupProduct }) {
  return (
    <span
      tabIndex={0}
      aria-label={`Informații: ${product.name}`}
      className="group relative inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border-[1.5px] border-taupe-500 text-xs font-bold text-taupe-500"
    >
      i
      <span className="pointer-events-none absolute top-[-6px] right-7 z-30 hidden w-56 rounded-xl bg-choc px-3 py-2 text-left text-xs leading-snug font-normal text-cream-100 group-hover:block group-focus:block">
        <b className="block">{product.name}</b>
        {product.description || "Fără descriere."}
      </span>
    </span>
  );
}

// A product name that opens the product: the name goes to its page in the admin,
// the arrow to its page on the site (both in a new tab, so nothing typed here is lost).
function ProductName({
  product,
  stacked = false,
}: {
  product: GroupProduct;
  // the site button under the name instead of beside it
  stacked?: boolean;
}) {
  return (
    <span
      className={
        stacked
          ? "flex max-w-full flex-col items-start gap-1"
          : "inline-flex max-w-full items-center gap-2"
      }
    >
      <a
        href={`/admin/products/${product.id}/edit`}
        target="_blank"
        rel="noopener noreferrer"
        title="Deschide produsul în admin (fereastră nouă)"
        className={`hover:text-salamander-600 hover:underline ${stacked ? "" : "truncate"}`}
      >
        {product.name}
      </a>
      <a
        href={product.siteHref}
        target="_blank"
        rel="noopener noreferrer"
        title="Vezi produsul pe site (fereastră nouă)"
        aria-label={`Vezi ${product.name} pe site`}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-salamander-300 bg-salamander-50 px-3 py-1 text-xs font-semibold whitespace-nowrap text-salamander-700 transition-colors hover:bg-salamander-100"
      >
        Vezi pe site ↗
      </a>
    </span>
  );
}

// The product photo as a link: opens the product in the admin (new tab).
function ProductPhoto({ product }: { product: GroupProduct }) {
  return (
    <a
      href={`/admin/products/${product.id}/edit`}
      target="_blank"
      rel="noopener noreferrer"
      title="Deschide produsul în admin (fereastră nouă)"
      aria-label={`Deschide ${product.name}`}
      className="block w-fit transition-opacity hover:opacity-80"
    >
      <Thumb url={product.imageUrl} className="h-16 w-16" />
    </a>
  );
}

// One row of the "Tipuri de grup" panel: rename, what it does, delete.
function TypeRow({
  type,
  onSaved,
  onError,
}: {
  type: GroupTypeRow;
  onSaved: () => void;
  onError: (text: string) => void;
}) {
  const [name, setName] = useState(type.name);
  const [showOnSite, setShowOnSite] = useState(type.showOnSite);
  const [hasDiscount, setHasDiscount] = useState(type.hasDiscount);
  const [busy, setBusy] = useState(false);
  const changed =
    name.trim() !== type.name ||
    showOnSite !== type.showOnSite ||
    hasDiscount !== type.hasDiscount;

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/group-types/${type.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, showOnSite, hasDiscount }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      onError("Nu am putut salva tipul. Scrie un nume de până la 40 de caractere.");
      return;
    }
    onSaved();
  }

  async function remove() {
    if (!window.confirm(`Ștergi tipul „${type.name}”?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/group-types/${type.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      onError(
        data?.error === "in_use"
          ? `Tipul „${type.name}” are ${data.groups} ${data.groups === 1 ? "grup" : "grupuri"}. Mută-le mai întâi la alt tip.`
          : data?.error === "last"
            ? "Trebuie să rămână cel puțin un tip."
            : "Nu am putut șterge tipul.",
      );
      return;
    }
    onSaved();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-cream-200 bg-white p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        aria-label="Numele tipului"
        className={controlClass(false, "w-48")}
      />
      <label className="flex items-center gap-2 text-sm text-taupe-700">
        <input
          type="checkbox"
          checked={showOnSite}
          onChange={(e) => setShowOnSite(e.target.checked)}
          className="h-4 w-4 accent-salamander-500"
        />
        Apare pe site ca „Merge bine cu”
      </label>
      <label className="flex items-center gap-2 text-sm text-taupe-700">
        <input
          type="checkbox"
          checked={hasDiscount}
          onChange={(e) => setHasDiscount(e.target.checked)}
          className="h-4 w-4 accent-salamander-500"
        />
        Are discount %
      </label>
      <span className="text-xs text-taupe-500">
        {type.groupCount} {type.groupCount === 1 ? "grup" : "grupuri"}
      </span>
      <span className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || !changed || !name.trim()}
          className={btnMain}
        >
          Salvează
        </button>
        <button type="button" onClick={remove} disabled={busy} className={btnDanger}>
          Șterge
        </button>
      </span>
    </li>
  );
}

export default function GroupsWindow() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [types, setTypes] = useState<GroupTypeRow[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [kindMenu, setKindMenu] = useState(false);
  const [managingTypes, setManagingTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [typeMessage, setTypeMessage] = useState<string | null>(null);

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

  const snapshot = (e: Editor | null) =>
    e
      ? JSON.stringify([
          e.name,
          e.typeId,
          e.discount,
          e.shuffle,
          e.maxItems,
          e.items.map((i) => i.id),
        ])
      : "";
  const dirty = editor !== null && snapshot(editor) !== saved;

  async function refreshGroups() {
    const res = await fetch("/api/admin/groups").catch(() => null);
    if (res?.ok) setGroups((await res.json()).groups);
  }

  async function refreshTypes(): Promise<GroupTypeRow[]> {
    const res = await fetch("/api/admin/group-types").catch(() => null);
    if (!res?.ok) return types;
    const list: GroupTypeRow[] = (await res.json()).types;
    setTypes(list);
    return list;
  }

  function startEditor(e: Editor) {
    setEditor(e);
    setSaved(snapshot(e));
    setMessage(null);
    setQuery("");
    setHits(null);
    setChecked([]);
    setComparing(false);
    setManagingTypes(false);
  }

  async function openGroup(id: string) {
    const res = await fetch(`/api/admin/groups/${id}`).catch(() => null);
    if (!res?.ok) {
      setMessage({ ok: false, text: "Nu am putut deschide grupul." });
      return;
    }
    const { group } = await res.json();
    startEditor({
      id: group.id,
      name: group.name,
      typeId: group.type.id,
      discount: group.discountPercent ? String(group.discountPercent) : "",
      shuffle: group.shuffle === true,
      maxItems: group.maxItems ? String(group.maxItems) : "",
      items: group.items,
    });
  }

  function newGroup(typeId: string, withProduct?: GroupProduct) {
    startEditor({
      id: null,
      name: "",
      typeId,
      discount: "",
      shuffle: false,
      maxItems: "",
      items: withProduct ? [withProduct] : [],
    });
    setKindMenu(false);
  }

  // opened from the menu or a product
  useEffect(() => {
    const onOpen = async (e: Event) => {
      const detail = ((e as CustomEvent).detail ?? {}) as OpenGroupsDetail;
      setOpen(true);
      refreshGroups();
      const list = await refreshTypes();
      if (detail.groupId) openGroup(detail.groupId);
      else if (detail.newWith) {
        newGroup(
          (list.find((t) => t.showOnSite) ?? list[0])?.id ?? "",
          detail.newWith,
        );
      } else setEditor(null);
    };
    window.addEventListener(OPEN_GROUPS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GROUPS_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    if (
      dirty &&
      !window.confirm("Ai modificări nesalvate în grup. Închizi fără să salvezi?")
    ) {
      return;
    }
    setOpen(false);
    setEditor(null);
    setManagingTypes(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dirty]);

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
    setEditor((e) => (e ? { ...e, ...patch } : e));

  const maxItems =
    editor && /^\d+$/.test(editor.maxItems) && Number(editor.maxItems) > 0
      ? Number(editor.maxItems)
      : null;
  const currentType = types.find((t) => t.id === editor?.typeId);
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
    update({ items: [...editor.items, ...fresh.slice(0, room)] });
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
    if (currentType?.hasDiscount && editor.discount && discountNumber === null) {
      setMessage({ ok: false, text: "Discountul trebuie să fie între 1 și 100%." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const body = JSON.stringify({
      name: editor.name,
      typeId: editor.typeId,
      discountPercent: currentType?.hasDiscount ? discountNumber : null,
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
        currentType?.hasDiscount && discountNumber ? String(discountNumber) : "",
    };
    setEditor(next);
    setSaved(snapshot(next));
    setMessage({ ok: true, text: "Grup salvat." });
    refreshGroups();
    refreshTypes();
    window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
    router.refresh();
  }

  async function removeGroup() {
    if (!editor?.id) return;
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
    setEditor(null);
    refreshGroups();
    refreshTypes();
    window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
    router.refresh();
  }

  function showInList() {
    if (!editor?.id) return;
    if (
      dirty &&
      !window.confirm("Ai modificări nesalvate. Continui fără să le salvezi?")
    ) {
      return;
    }
    setOpen(false);
    setEditor(null);
    router.push(`/admin/products?grp=${editor.id}`);
  }

  async function addType() {
    const name = newTypeName.trim();
    if (!name) return;
    setTypeMessage(null);
    const res = await fetch("/api/admin/group-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, showOnSite: false, hasDiscount: false }),
    }).catch(() => null);
    if (!res?.ok) {
      setTypeMessage(
        "Nu am putut adăuga tipul. Numele are voie până la 40 de caractere.",
      );
      return;
    }
    setNewTypeName("");
    await refreshTypes();
  }

  async function typesChanged() {
    setTypeMessage(null);
    await Promise.all([refreshTypes(), refreshGroups()]);
    window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
    router.refresh();
  }

  if (!open) return null;

  const have = new Set(editor?.items.map((i) => i.id) ?? []);
  const alphabetical = editor
    ? [...editor.items].sort((a, b) => a.name.localeCompare(b.name, "ro"))
    : [];
  // results only count while something is typed
  const shown = query.trim() ? hits : null;
  const compared = (shown?.products ?? []).filter((p) =>
    checked.includes(p.id),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-choc/60 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Grupuri"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-choc bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 bg-choc px-5 py-3 text-cream-100">
          <h2 className="font-display text-lg">Grupuri</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setKindMenu((v) => !v)}
                className={btnMain}
              >
                + Grup nou ▾
              </button>
              {kindMenu && (
                <div className="absolute top-full right-0 z-40 mt-1 w-64 overflow-hidden rounded-xl border border-cream-300 bg-white text-sm text-taupe-800 shadow-lg">
                  <p className="bg-cream-50 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-taupe-500 uppercase">
                    Ce tip de grup?
                  </p>
                  {types.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => newGroup(t.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-cream-50"
                    >
                      <b>{t.name}</b>
                      <span className="text-xs text-taupe-500">
                        {t.showOnSite
                          ? "apare pe site"
                          : t.hasDiscount
                            ? "cu discount"
                            : "intern"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
            >
              Închide ✕
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div className="flex shrink-0 flex-col gap-2 overflow-y-auto border-b border-cream-200 bg-cream-50 p-3 md:w-64 md:border-r md:border-b-0">
            {groups.length === 0 && (
              <p className="p-2 text-sm text-taupe-500">
                Încă niciun grup. Apasă „+ Grup nou”.
              </p>
            )}
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  if (g.id === editor?.id) return;
                  if (
                    dirty &&
                    !window.confirm(
                      "Ai modificări nesalvate. Treci la alt grup fără să salvezi?",
                    )
                  ) {
                    return;
                  }
                  openGroup(g.id);
                }}
                className={`rounded-xl border bg-white px-3 py-2 text-left text-sm transition-colors ${
                  g.id === editor?.id
                    ? "border-salamander-500 ring-2 ring-salamander-200"
                    : "border-cream-200 hover:border-salamander-300"
                }`}
              >
                <b className="block text-taupe-800">{g.name}</b>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-taupe-500">
                  <TypeBadge type={g.type} />
                  {g.discountPercent ? `−${g.discountPercent}%` : ""} {g.count}{" "}
                  {g.count === 1 ? "produs" : "produse"}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (
                  dirty &&
                  !window.confirm(
                    "Ai modificări nesalvate. Continui fără să le salvezi?",
                  )
                ) {
                  return;
                }
                setEditor(null);
                setManagingTypes((v) => !v);
              }}
              className="mt-2 rounded-xl border border-dashed border-cream-300 px-3 py-2 text-left text-sm font-medium text-salamander-600 hover:bg-white"
            >
              Tipuri de grup…
            </button>
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {managingTypes ? (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-semibold text-taupe-800">
                    Tipuri de grup
                  </h3>
                  <p className="mt-1 text-sm text-taupe-500">
                    Poți redenumi, adăuga sau șterge tipuri (un tip se șterge doar
                    dacă nu are grupuri). „Apare pe site” înseamnă că produsele
                    grupului se văd clienților ca „Merge bine cu”. „Are discount
                    %” adaugă câmpul de discount la grupurile acelui tip.
                  </p>
                </div>
                <ul className="flex flex-col gap-2">
                  {types.map((t) => (
                    <TypeRow
                      key={`${t.id}-${t.name}-${t.showOnSite}-${t.hasDiscount}`}
                      type={t}
                      onSaved={typesChanged}
                      onError={setTypeMessage}
                    />
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 border-t border-cream-200 pt-4">
                  <input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    maxLength={40}
                    placeholder="Tip nou (ex. Promoție de Crăciun)"
                    className={controlClass(false, "w-72")}
                  />
                  <button
                    type="button"
                    onClick={addType}
                    disabled={!newTypeName.trim()}
                    className={btnMain}
                  >
                    + Adaugă tip
                  </button>
                </div>
                {typeMessage && (
                  <p role="status" className="text-sm font-medium text-red-600">
                    {typeMessage}
                  </p>
                )}
              </div>
            ) : !editor ? (
              <p className="text-sm text-taupe-500">
                Alege un grup din stânga sau creează unul nou.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end gap-4">
                  <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
                    Nume grup
                    <input
                      value={editor.name}
                      onChange={(e) => update({ name: e.target.value })}
                      maxLength={80}
                      className={controlClass(false, "w-56")}
                    />
                  </label>
                  <div className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
                    Tip de grup
                    <div className="inline-flex flex-wrap overflow-hidden rounded-2xl border border-taupe-400">
                      {types.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => update({ typeId: t.id })}
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
                              discount: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 3),
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
                    <p className="text-xs text-taupe-500">
                      Deocamdată discountul doar se salvează la grup; nu schimbă
                      încă prețurile din magazin.
                    </p>
                  </div>
                )}

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
                        Produsele din grup apar într-o altă ordine la fiecare
                        vizită. Fără bifă, apar în ordinea de mai jos.
                      </span>
                    </span>
                  </label>
                )}

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
                      {shown.products.length === 0 &&
                        shown.categories.length === 0 && (
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
                            {checked.length === 1
                              ? "produs bifat"
                              : "produse bifate"}
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
                            Bifează 2 sau mai multe produse ca să le vezi unul
                            lângă altul.
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
                    „Adaugă toate” pune produsele active de acum din categorie;
                    după aceea le poți scoate pe cele care nu se potrivesc.
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
                          <th className="px-1 py-2" />
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {alphabetical.map((p, index) => (
                          <tr key={p.id} className="border-t border-cream-200">
                            <td className="px-3 py-1.5 text-taupe-500">
                              {index + 1}
                            </td>
                            <td className="px-1 py-1.5">
                              <ProductPhoto product={p} />
                            </td>
                            <td className="px-3 py-1.5">
                              <ProductName product={p} stacked />
                            </td>
                            <td className="px-3 py-1.5">{p.stock}</td>
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
                      Ordinea pe site (în ordinea alegerii; trage un card peste
                      altul ca s-o schimbi)
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

                {message && (
                  <p
                    role="status"
                    className={`text-sm font-medium ${
                      message.ok ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {message.text}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-cream-200 pt-4">
                  <button
                    type="button"
                    onClick={save}
                    disabled={busy || !dirty}
                    className={btnMain}
                  >
                    {busy ? "Se salvează…" : "Salvează grupul"}
                  </button>
                  <button type="button" onClick={close} className={btn}>
                    Închide
                  </button>
                  {editor.id && (
                    <button type="button" onClick={showInList} className={btn}>
                      Arată produsele în listă
                    </button>
                  )}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
