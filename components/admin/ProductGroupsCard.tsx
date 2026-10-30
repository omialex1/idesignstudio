"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminCard from "@/components/admin/AdminCard";
import { controlClass } from "@/components/admin/FormBits";
import {
  GROUPS_CHANGED_EVENT,
  openGroups,
} from "@/components/admin/groups-events";
import TypeBadge from "@/components/admin/TypeBadge";
import type { GroupTypeInfo } from "@/lib/admin/group-types";

type GroupChoice = {
  id: string;
  name: string;
  type: GroupTypeInfo;
  maxItems: number | null;
  count: number;
  member: boolean;
  // discount of the group, and this product's own switch in it (null: follows the group)
  discountPercent?: number | null;
  discountLive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  live?: boolean | null;
};

type DiscountState = {
  chosenGroupId: string | null;
  tiered: boolean;
  // the discount customers get right now
  now: { percent: number; groupId: string; groupName: string } | null;
};

// A choice made on the "new product" page: the product does not exist yet, so
// it is applied right after the product is created.
export type PendingGroup =
  | { key: string; groupId: string; label: string; type: GroupTypeInfo }
  | { key: string; newName: string; label: string; type: GroupTypeInfo };

// "Grupuri" card of a product: the groups it is in, add it to an existing group or
// start a new one. On the edit page it works at once; on the "new product" page
// (productId null) the choices wait in `pending` until the product is created.
export default function ProductGroupsCard({
  productId,
  pending = [],
  onPendingChange,
}: {
  productId: string | null;
  pending?: PendingGroup[];
  onPendingChange?: (next: PendingGroup[]) => void;
}) {
  const [groups, setGroups] = useState<GroupChoice[]>([]);
  const [menu, setMenu] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [types, setTypes] = useState<GroupTypeInfo[]>([]);
  const [discount, setDiscount] = useState<DiscountState | null>(null);
  const [newTypeId, setNewTypeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const url = productId
      ? `/api/admin/products/${productId}/groups`
      : "/api/admin/groups";
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    setGroups(
      data.groups.map((g: GroupChoice) => ({
        ...g,
        member: g.member ?? false,
      })),
    );
    setDiscount(
      productId
        ? {
            chosenGroupId: data.chosenGroupId ?? null,
            tiered: data.tiered === true,
            now: data.now ?? null,
          }
        : null,
    );
    const typesRes = await fetch("/api/admin/group-types").catch(() => null);
    if (typesRes?.ok) {
      const list: GroupTypeInfo[] = (await typesRes.json()).types;
      setTypes(list);
      setNewTypeId((current) =>
        list.some((t) => t.id === current)
          ? current
          : (list.find((t) => t.showOnSite) ?? list[0])?.id ?? "",
      );
    }
  }, [productId]);

  useEffect(() => {
    // the list of groups lives on the server: read it once the card is shown
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    window.addEventListener(GROUPS_CHANGED_EVENT, load);
    return () => window.removeEventListener(GROUPS_CHANGED_EVENT, load);
  }, [load]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const pendingIds = new Set(
    pending.flatMap((p) => ("groupId" in p ? [p.groupId] : [])),
  );
  const isMember = (g: GroupChoice) =>
    productId ? g.member : pendingIds.has(g.id);
  const memberGroups = productId
    ? groups.filter((g) => g.member)
    : groups.filter((g) => pendingIds.has(g.id));
  // the groups of this product that carry a discount
  const discountGroups = memberGroups.filter(
    (g) => g.type.hasDiscount && (g.discountPercent ?? 0) > 0,
  );

  async function post(path: string, body: unknown) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    return { ok: !!res?.ok, data: await res?.json().catch(() => null) };
  }

  async function setLive(g: GroupChoice, value: string) {
    if (!productId) return;
    setBusy(true);
    setError(null);
    const { ok } = await post(`/api/admin/products/${productId}/groups`, {
      groupId: g.id,
      live: value === "group" ? null : value === "on",
    });
    setBusy(false);
    if (!ok) setError("Nu am putut schimba discountul produsului.");
    await load();
  }

  async function choose(value: string) {
    if (!productId) return;
    setBusy(true);
    setError(null);
    const { ok } = await post(`/api/admin/products/${productId}/groups`, {
      choose: value === "auto" ? null : value,
    });
    setBusy(false);
    if (!ok) setError("Nu am putut alege discountul.");
    await load();
  }

  async function add(g: GroupChoice) {
    setError(null);
    if (!productId) {
      onPendingChange?.([
        ...pending,
        { key: g.id, groupId: g.id, label: g.name, type: g.type },
      ]);
      setMenu(false);
      return;
    }
    setBusy(true);
    const { ok, data } = await post(`/api/admin/products/${productId}/groups`, {
      groupId: g.id,
    });
    setBusy(false);
    if (!ok) {
      setError(
        data?.error === "max"
          ? `Grupul „${g.name}” a atins maximul de produse.`
          : "Nu am putut adăuga produsul în grup.",
      );
      return;
    }
    setMenu(false);
    await load();
  }

  async function removeFrom(g: GroupChoice) {
    setError(null);
    if (!productId) {
      onPendingChange?.(
        pending.filter((p) => !("groupId" in p && p.groupId === g.id)),
      );
      return;
    }
    setBusy(true);
    const { ok } = await post(`/api/admin/products/${productId}/groups`, {
      groupId: g.id,
      remove: true,
    });
    setBusy(false);
    if (!ok) setError("Nu am putut scoate produsul din grup.");
    await load();
  }

  async function createGroup() {
    const name = newName.trim();
    if (!name) {
      setError("Scrie un nume pentru grupul nou.");
      return;
    }
    setError(null);
    if (!productId) {
      onPendingChange?.([
        ...pending,
        {
          key: `new-${Date.now()}`,
          newName: name,
          label: name,
          type: types.find((t) => t.id === newTypeId) ?? types[0],
        },
      ]);
    } else {
      setBusy(true);
      const { ok } = await post("/api/admin/groups", {
        name,
        typeId: newTypeId,
        productIds: [productId],
      });
      setBusy(false);
      if (!ok) {
        setError("Nu am putut crea grupul.");
        return;
      }
      await load();
    }
    setNewName("");
    setCreating(false);
    setMenu(false);
  }

  const chip =
    "inline-flex items-center gap-2 rounded-full border border-cream-300 bg-cream-100 py-1 pl-3 pr-1.5 text-sm";

  return (
    <AdminCard title="Grupuri" bodyClassName="flex flex-col gap-3 p-6">
      <p className="text-xs text-taupe-400">
        Un grup „Merge bine cu” arată clienților, sub acest produs, celelalte
        produse din grup. Grupurile promoționale sunt interne.
        {!productId && " Alegerea se aplică după ce creezi produsul."}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {memberGroups.map((g) => (
          <span key={g.id} className={chip}>
            {g.name}{" "}
            <TypeBadge type={g.type} />
            <button
              type="button"
              onClick={() => removeFrom(g)}
              disabled={busy}
              aria-label={`Scoate din grupul ${g.name}`}
              className="rounded-full px-2 text-red-700 hover:bg-red-50"
            >
              ✕
            </button>
          </span>
        ))}
        {pending
          .filter((p) => "newName" in p)
          .map((p) => (
            <span key={p.key} className={chip}>
              {p.label}{" "}
              <TypeBadge type={p.type} />
              <span className="text-xs text-taupe-500">grup nou</span>
              <button
                type="button"
                onClick={() =>
                  onPendingChange?.(pending.filter((x) => x.key !== p.key))
                }
                aria-label={`Renunță la grupul nou ${p.label}`}
                className="rounded-full px-2 text-red-700 hover:bg-red-50"
              >
                ✕
              </button>
            </span>
          ))}
        {memberGroups.length === 0 && !pending.some((p) => "newName" in p) && (
          <span className="text-sm text-taupe-500">
            Produsul nu e în niciun grup.
          </span>
        )}
      </div>

      {productId && discount && discountGroups.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-taupe-800">Discounturi</h3>
          {discount.tiered ? (
            <p className="text-xs text-taupe-600">
              Produsul are preț pe cantități (invitații): nu primește discount din grup.
            </p>
          ) : (
            <>
              <p
                className={`text-sm font-semibold ${
                  discount.now ? "text-red-700" : "text-taupe-600"
                }`}
              >
                {discount.now
                  ? `Acum clienții primesc −${discount.now.percent}% (din „${discount.now.groupName}”).`
                  : "Acum clienții nu primesc niciun discount la acest produs."}
              </p>
              <ul className="flex flex-col gap-2">
                {discountGroups.map((g) => (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {g.name} −{g.discountPercent}%
                    </span>
                    <span className="text-xs text-taupe-500">
                      grupul e {g.discountLive ? "pornit" : "oprit"}
                    </span>
                    <select
                      value={g.live === null || g.live === undefined ? "group" : g.live ? "on" : "off"}
                      onChange={(e) => setLive(g, e.target.value)}
                      disabled={busy}
                      aria-label={`Discountul „${g.name}” la acest produs`}
                      className="ml-auto rounded-lg border border-cream-300 bg-white px-2 py-1 text-xs"
                    >
                      <option value="group">Urmează grupul</option>
                      <option value="on">Pornit pentru acest produs</option>
                      <option value="off">Oprit pentru acest produs</option>
                    </select>
                  </li>
                ))}
              </ul>
              {discountGroups.length > 1 && (
                <label className="flex flex-col gap-1 text-xs font-medium text-taupe-700">
                  ⚠ Produsul e în {discountGroups.length} grupuri cu discount. Se
                  aplică un singur discount:
                  <select
                    value={
                      discountGroups.some((g) => g.id === discount.chosenGroupId)
                        ? (discount.chosenGroupId as string)
                        : "auto"
                    }
                    onChange={(e) => choose(e.target.value)}
                    disabled={busy}
                    className="w-fit rounded-lg border border-cream-300 bg-white px-2 py-1.5 text-sm font-normal"
                  >
                    <option value="auto">Cel mai mare (automat)</option>
                    {discountGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        „{g.name}” (−{g.discountPercent}%)
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
        </div>
      )}

      <div ref={root} className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          className="rounded-full border border-cream-300 bg-cream-100 px-4 py-2 text-sm font-semibold text-taupe-800 hover:bg-cream-200"
        >
          Adaugă la grup ▾
        </button>
        <button
          type="button"
          onClick={() => openGroups()}
          className="text-sm font-medium text-salamander-600 hover:underline"
        >
          Deschide fereastra Grupuri
        </button>

        {/* in the flow (not floating): the card clips anything that sticks out */}
        {menu && (
          <div className="w-full max-w-sm basis-full overflow-hidden rounded-xl border border-cream-300 bg-white text-sm shadow-lg">
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="w-full border-b border-cream-200 px-3 py-2 text-left font-bold text-salamander-600 hover:bg-cream-50"
            >
              + Grup nou cu acest produs…
            </button>
            {creating && (
              <div className="flex flex-col gap-2 border-b border-cream-200 bg-cream-50 p-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={80}
                  placeholder="Nume grup (ex. Set baie)"
                  className={controlClass(false, "w-full")}
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newTypeId}
                    onChange={(e) => setNewTypeId(e.target.value)}
                    className={controlClass(false, "bg-white")}
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={createGroup}
                    disabled={busy}
                    className="rounded-full bg-salamander-500 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-salamander-600 disabled:opacity-60"
                  >
                    Creează
                  </button>
                </div>
              </div>
            )}
            <p className="bg-cream-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-taupe-500">
              Grupuri existente
            </p>
            {groups.length === 0 && (
              <p className="px-3 py-2 text-taupe-500">Încă niciun grup.</p>
            )}
            <div className="max-h-60 overflow-y-auto">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={busy || isMember(g)}
                  onClick={() => add(g)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-cream-50 disabled:cursor-default disabled:opacity-60"
                >
                  <span className="truncate">{g.name}</span>
                  {isMember(g) ? (
                    <span className="text-xs font-semibold text-green-700">
                      ✓ în grup
                    </span>
                  ) : (
                    <TypeBadge type={g.type} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </AdminCard>
  );
}
