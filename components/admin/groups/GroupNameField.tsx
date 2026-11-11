"use client";

import { useEffect, useRef, useState } from "react";
import { controlClass } from "@/components/admin/FormBits";
import type { CategoryHit } from "@/components/admin/groups/parts";

// The "Nume grup" field of a NEW group: while typing, the existing categories and
// subcategories matching the text are suggested. Picking one fills in the name
// and hands the category to `onPick` (the page adds its products); typing any
// other name and ignoring the list still makes a fresh, empty group.
export default function GroupNameField({
  value,
  onChange,
  onPick,
  suggest,
}: {
  value: string;
  onChange: (text: string) => void;
  onPick: (hit: CategoryHit) => void;
  // false (an existing group): a plain text field
  suggest: boolean;
}) {
  const root = useRef<HTMLLabelElement>(null);
  const seq = useRef(0);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<CategoryHit[]>([]);
  const [active, setActive] = useState(-1);

  // look up the matching categories while typing (and when the field is opened)
  useEffect(() => {
    if (!suggest || !open) return;
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/admin/groups/search?cats=1&q=${encodeURIComponent(value.trim())}`,
      ).catch(() => null);
      if (mine !== seq.current || !res?.ok) return;
      setHits((await res.json()).categories ?? []);
      setActive(-1);
    }, 150);
    return () => clearTimeout(timer);
  }, [value, open, suggest]);

  // a click anywhere else closes the list
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(hit: CategoryHit) {
    setOpen(false);
    onChange(hit.name);
    onPick(hit);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggest) return;
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" && hits.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp" && hits.length > 0) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === "Enter" && open && active >= 0 && hits[active]) {
      e.preventDefault();
      pick(hits[active]);
    }
  }

  const showList = suggest && open && hits.length > 0;

  return (
    <label
      ref={root}
      className="relative flex flex-col gap-1 text-xs font-medium text-taupe-500"
    >
      Nume grup
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        maxLength={80}
        autoComplete="off"
        role={suggest ? "combobox" : undefined}
        aria-expanded={suggest ? showList : undefined}
        aria-autocomplete={suggest ? "list" : undefined}
        placeholder={suggest ? "Scrie un nume sau alege o categorie…" : undefined}
        className={controlClass(false, "w-72 max-w-full")}
      />
      {showList && (
        <div
          role="listbox"
          className="absolute top-full left-0 z-30 mt-1 max-h-72 w-96 max-w-[90vw] overflow-y-auto rounded-xl border border-cream-300 bg-white text-sm font-normal text-taupe-800 shadow-lg"
        >
          <p className="sticky top-0 border-b border-cream-200 bg-cream-50 px-3 py-1.5 text-[11px] text-taupe-500">
            Alege o categorie sau subcategorie ca să adaugi toate produsele ei,
            sau scrie un nume nou pentru un grup gol.
          </p>
          {hits.map((hit, index) => (
            <button
              key={`${hit.kind}${hit.id}`}
              type="button"
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(hit)}
              className={`flex w-full items-center gap-3 border-b border-cream-200 px-3 py-2 text-left last:border-b-0 ${
                index === active ? "bg-cream-100" : "hover:bg-cream-50"
              }`}
            >
              <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                {hit.kind === "main" ? "Categorie" : "Subcategorie"}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <b>{hit.name}</b>
                {hit.parent && (
                  <span className="text-xs text-taupe-500"> · {hit.parent}</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-taupe-500">
                {hit.count} produse
              </span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
