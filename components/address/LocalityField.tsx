"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { matchLocality } from "@/lib/geo/match";

// The lists are small (up to ~700 names) and rarely change: keep each county in
// memory once loaded.
const cache = new Map<string, string[]>();
const NO_LOCALITIES: string[] = [];

// Locality field with the localities of the chosen county as suggestions. The
// customer can pick from the list or type; a name that is not in the list is
// accepted but flagged (the shop checks such orders before shipping), and a
// name shared by several villages must be picked from the list.
export default function LocalityField({
  county,
  value,
  onChange,
  label,
  required = true,
  inputClassName,
}: {
  county: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  inputClassName: string;
}) {
  const t = useTranslations("Address");
  const listId = useId();
  // lists loaded in this component; the module cache covers other fields/pages
  const [loadedLists, setLoadedLists] = useState<Record<string, string[]>>({});
  const loadedList = county
    ? (loadedLists[county] ?? cache.get(county))
    : undefined;
  const list = loadedList ?? NO_LOCALITIES;
  const loaded = loadedList !== undefined;

  useEffect(() => {
    if (!county || cache.has(county)) return;
    let active = true;
    fetch(`/api/geo/localities?county=${encodeURIComponent(county)}`)
      .then((res) => (res.ok ? res.json() : { localities: [] }))
      .then((data: { localities: string[] }) => {
        cache.set(county, data.localities);
        if (active) {
          setLoadedLists((prev) => ({ ...prev, [county]: data.localities }));
        }
      })
      .catch(() => {
        if (active) setLoadedLists((prev) => ({ ...prev, [county]: [] }));
      });
    return () => {
      active = false;
    };
  }, [county]);

  const match = useMemo(
    () =>
      loaded && value.trim() && list.length > 0
        ? matchLocality(list, value)
        : null,
    [loaded, value, list],
  );
  const ambiguous = match?.status === "ambiguous";
  const unknown = match?.status === "unknown";

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-taupe-700">{label}</span>
      <input
        required={required}
        list={listId}
        autoComplete="off"
        maxLength={150}
        disabled={!county}
        placeholder={county ? t("localityPlaceholder") : t("pickCountyFirst")}
        value={value}
        ref={(el) =>
          el?.setCustomValidity(
            ambiguous ? t("localityAmbiguous", { value }) : "",
          )
        }
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          // write the official spelling once the name is recognised
          if (match?.status === "exact" && match.value !== value) {
            onChange(match.value);
          }
        }}
        aria-invalid={ambiguous || unknown}
        className={`${inputClassName} disabled:bg-cream-100 disabled:text-taupe-400`}
      />
      <datalist id={listId}>
        {list.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {ambiguous && (
        <span role="alert" className="text-xs text-red-600">
          {t("localityAmbiguous", { value })}
        </span>
      )}
      {unknown && (
        <span role="status" className="text-xs text-amber-700">
          {t("localityUnknown", { value, county })}
        </span>
      )}
    </label>
  );
}
