"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupKind, GroupProduct, GroupSummary } from "@/lib/admin/groups";
import {
  GROUPS_CHANGED_EVENT,
  OPEN_GROUPS_EVENT,
  type OpenGroupsDetail,
} from "@/components/admin/groups-events";
import { controlClass } from "@/components/admin/FormBits";

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
  kind: GroupKind;
  maxItems: string;
  // in the order they were chosen
  items: GroupProduct[];
};

const KIND_LABEL: Record<GroupKind, string> = {
  recommended: "Merge bine cu",
  promo: "Promoțional",
};
const KIND_NOTE: Record<GroupKind, string> = {
  recommended: "apare pe site",
  promo: "intern",
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
      <span className="pointer-events-none absolute right-7 top-[-6px] z-30 hidden w-56 rounded-xl bg-choc px-3 py-2 text-left text-xs font-normal leading-snug text-cream-100 group-hover:block group-focus:block">
        <b className="block">{product.name}</b>
        {product.description || "Fără descriere."}
      </span>
    </span>
  );
}

function KindBadge({ kind }: { kind: GroupKind }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
        kind === "recommended"
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

export default function GroupsWindow() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [kindMenu, setKindMenu] = useState(false);

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
      ? JSON.stringify([e.name, e.kind, e.maxItems, e.items.map((i) => i.id)])
      : "";
  const dirty = editor !== null && snapshot(editor) !== saved;

  async function refreshGroups() {
    const res = await fetch("/api/admin/groups").catch(() => null);
    if (res?.ok) setGroups((await res.json()).groups);
  }

  function startEditor(e: Editor) {
    setEditor(e);
    setSaved(snapshot(e));
    setMessage(null);
    setQuery("");
    setHits(null);
    setChecked([]);
    setComparing(false);
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
      kind: group.kind,
      maxItems: group.maxItems ? String(group.maxItems) : "",
      items: group.items,
    });
  }

  function newGroup(kind: GroupKind, withProduct?: GroupProduct) {
    startEditor({
      id: null,
      name: "",
      kind,
      maxItems: "",
      items: withProduct ? [withProduct] : [],
    });
    setKindMenu(false);
  }

  // opened from the menu, the filter or a product
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = ((e as CustomEvent).detail ?? {}) as OpenGroupsDetail;
      setOpen(true);
      refreshGroups();
      if (detail.groupId) openGroup(detail.groupId);
      else if (detail.newWith) newGroup("recommended", detail.newWith);
      else setEditor(null);
    };
    window.addEventListener(OPEN_GROUPS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GROUPS_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    if (
      dirty &&
      !window.confirm(
        "Ai modificări nesalvate în grup. Închizi fără să salvezi?",
      )
    ) {
      return;
    }
    setOpen(false);
    setEditor(null);
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
    setBusy(true);
    setMessage(null);
    const body = JSON.stringify({
      name: editor.name,
      kind: editor.kind,
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
    const next = { ...editor, id };
    setEditor(next);
    setSaved(snapshot(next));
    setMessage({ ok: true, text: "Grup salvat." });
    refreshGroups();
    window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
    router.refresh();
  }

  async function removeGroup() {
    if (!editor?.id) return;
    if (
      !window.confirm(
        `Ștergi grupul „${editor.name}”? Produsele rămân, doar grupul dispare.`,
      )
    )
      return;
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
    window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
    router.refresh();
  }

  function showInList() {
    if (!editor?.id) return;
    if (
      dirty &&
      !window.confirm("Ai modificări nesalvate. Continui fără să le salvezi?")
    )
      return;
    setOpen(false);
    setEditor(null);
    router.push(`/admin/products?grp=${editor.id}`);
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
                <div className="absolute right-0 top-full z-40 mt-1 w-60 overflow-hidden rounded-xl border border-cream-300 bg-white text-sm text-taupe-800 shadow-lg">
                  <p className="bg-cream-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-taupe-500">
                    Ce fel de grup?
                  </p>
                  {(["recommended", "promo"] as GroupKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => newGroup(k)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-cream-50"
                    >
                      <b>{KIND_LABEL[k]}</b>
                      <span className="text-xs text-taupe-500">
                        {KIND_NOTE[k]}
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
          <div className="flex shrink-0 flex-col gap-2 overflow-y-auto border-b border-cream-200 bg-cream-50 p-3 md:w-64 md:border-b-0 md:border-r">
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
                  )
                    return;
                  openGroup(g.id);
                }}
                className={`rounded-xl border bg-white px-3 py-2 text-left text-sm transition-colors ${
                  g.id === editor?.id
                    ? "border-salamander-500 ring-2 ring-salamander-200"
                    : "border-cream-200 hover:border-salamander-300"
                }`}
              >
                <b className="block text-taupe-800">{g.name}</b>
                <span className="mt-1 flex items-center gap-2 text-xs text-taupe-500">
                  <KindBadge kind={g.kind} /> {g.count}{" "}
                  {g.count === 1 ? "produs" : "produse"}
                </span>
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {!editor ? (
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
                    Fel de grup
                    <div className="inline-flex overflow-hidden rounded-full border border-taupe-400">
                      {(["recommended", "promo"] as GroupKind[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => update({ kind: k })}
                          className={`px-4 py-2 text-sm ${
                            editor.kind === k
                              ? "bg-choc font-semibold text-white"
                              : "text-taupe-700 hover:bg-cream-100"
                          }`}
                        >
                          {KIND_LABEL[k]}
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
                          maxItems: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4),
                        })
                      }
                      inputMode="numeric"
                      placeholder="∞ fără limită"
                      className={controlClass(false, "w-36")}
                    />
                  </label>
                </div>

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
                            <b className="block truncate">{p.name}</b>
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
                                {p.name}
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
                                className="whitespace-pre-line text-xs leading-snug"
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
                    Produsele din grup, în ordine alfabetică (
                    {editor.items.length}
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
                              <Thumb url={p.imageUrl} />
                            </td>
                            <td className="px-3 py-1.5">{p.name}</td>
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
                          <span className="absolute left-1.5 top-1.5 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-choc text-[10px] text-white">
                            {index + 1}
                          </span>
                          <Thumb
                            url={p.imageUrl}
                            className="mb-1 h-12 w-full"
                          />
                          {p.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {message && (
                  <p
                    role="status"
                    className={`text-sm font-medium ${message.ok ? "text-green-700" : "text-red-600"}`}
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
