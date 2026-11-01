"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupTypeRow } from "@/lib/admin/group-types";
import { controlClass } from "@/components/admin/FormBits";
import { btnDanger, btnMain } from "@/components/admin/groups/parts";

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
  const [showLabel, setShowLabel] = useState(type.showLabel);
  const [busy, setBusy] = useState(false);
  const changed =
    name.trim() !== type.name ||
    showOnSite !== type.showOnSite ||
    hasDiscount !== type.hasDiscount ||
    (hasDiscount && showLabel !== type.showLabel);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/group-types/${type.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, showOnSite, hasDiscount, showLabel }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      onError(
        "Nu am putut salva tipul. Scrie un nume de până la 40 de caractere.",
      );
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
      {hasDiscount && (
        <label className="flex items-center gap-2 text-sm text-taupe-700">
          <input
            type="checkbox"
            checked={showLabel}
            onChange={(e) => setShowLabel(e.target.checked)}
            className="h-4 w-4 accent-salamander-500"
          />
          Arată numele tipului pe site, lângă preț
        </label>
      )}
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
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className={btnDanger}
        >
          Șterge
        </button>
      </span>
    </li>
  );
}

// The page of the kinds of group: rename, add, delete.
export default function TypeManager({ types }: { types: GroupTypeRow[] }) {
  const router = useRouter();
  const [newTypeName, setNewTypeName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function addType() {
    const name = newTypeName.trim();
    if (!name) return;
    setMessage(null);
    const res = await fetch("/api/admin/group-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, showOnSite: false, hasDiscount: false }),
    }).catch(() => null);
    if (!res?.ok) {
      setMessage(
        "Nu am putut adăuga tipul. Numele are voie până la 40 de caractere.",
      );
      return;
    }
    setNewTypeName("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-taupe-500">
        Poți redenumi, adăuga sau șterge tipuri (un tip se șterge doar dacă nu
        are grupuri). „Apare pe site” înseamnă că produsele grupului se văd
        clienților ca „Merge bine cu”. „Are discount %” adaugă câmpul de
        discount la grupurile acelui tip.
      </p>
      <ul className="flex flex-col gap-2">
        {types.map((t) => (
          <TypeRow
            key={`${t.id}-${t.name}-${t.showOnSite}-${t.hasDiscount}-${t.showLabel}`}
            type={t}
            onSaved={() => {
              setMessage(null);
              router.refresh();
            }}
            onError={setMessage}
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
      {message && (
        <p role="status" className="text-sm font-medium text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
