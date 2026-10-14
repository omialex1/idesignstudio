"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  matchLocality,
  suggestLocalities,
  type UrbanKind,
} from "@/lib/geo/match";

type CountyData = { list: string[]; urban: Record<string, UrbanKind> };

// Each county is loaded once and kept in memory (up to ~700 names).
const cache = new Map<string, CountyData>();

// Locality field with its own suggestion list. Cities, towns and municipalities
// are listed first and labelled (county seat, municipality, town), the match
// works without diacritics, and a place is shown even when it is typed in full.
// A name that is not in the list is accepted but flagged (the shop checks such
// orders before shipping); a name shared by several villages must be picked from
// the list.
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
  const [loadedData, setLoadedData] = useState<Record<string, CountyData>>({});
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const data = county ? (loadedData[county] ?? cache.get(county)) : undefined;
  const loaded = data !== undefined;

  useEffect(() => {
    if (!county || cache.has(county)) return;
    let alive = true;
    fetch(`/api/geo/localities?county=${encodeURIComponent(county)}`)
      .then((res) => (res.ok ? res.json() : { localities: [], urban: {} }))
      .then(
        (body: { localities: string[]; urban?: Record<string, UrbanKind> }) => {
          const result = { list: body.localities, urban: body.urban ?? {} };
          cache.set(county, result);
          if (alive) setLoadedData((prev) => ({ ...prev, [county]: result }));
        },
      )
      .catch(() => {
        if (alive) {
          setLoadedData((prev) => ({
            ...prev,
            [county]: { list: [], urban: {} },
          }));
        }
      });
    return () => {
      alive = false;
    };
  }, [county]);

  const list = data?.list;
  const urban = data?.urban;

  const match = useMemo(
    () =>
      loaded && list && value.trim() && list.length > 0
        ? matchLocality(list, value)
        : null,
    [loaded, value, list],
  );
  const ambiguous = match?.status === "ambiguous";
  const unknown = match?.status === "unknown";

  const suggestions = useMemo(
    () => (list && urban ? suggestLocalities(list, urban, value) : []),
    [list, urban, value],
  );
  const showList = open && suggestions.length > 0;

  const kindLabel = (display: string) => {
    const kind = urban?.[display];
    if (kind === "seat") return t("kindSeat");
    if (kind === "municipality") return t("kindMunicipality");
    if (kind === "town") return t("kindTown");
    if (kind === "sector") return t("kindSector");
    return null;
  };

  function choose(display: string) {
    onChange(display);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && showList && active >= 0) {
      e.preventDefault(); // pick the highlighted place, do not submit the form
      choose(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5 text-sm">
      <label htmlFor={`${listId}-input`} className="font-medium text-taupe-700">
        {label}
      </label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 ? `${listId}-opt-${active}` : undefined
        }
        required={required}
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
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          // write the official spelling once the name is recognised
          if (match?.status === "exact" && match.value !== value) {
            onChange(match.value);
          }
        }}
        onKeyDown={onKeyDown}
        aria-invalid={ambiguous || unknown}
        className={`${inputClassName} disabled:bg-cream-100 disabled:text-taupe-400`}
      />

      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 min-w-[16rem] overflow-auto rounded-lg border border-cream-200 bg-white py-1 shadow-lg"
        >
          {!value.trim() && (
            <li
              aria-hidden="true"
              className="px-3 py-1 text-xs tracking-wide text-taupe-400 uppercase"
            >
              {t("citiesAndTowns")}
            </li>
          )}
          {suggestions.map((display, i) => {
            const kind = kindLabel(display);
            return (
              <li
                key={display}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                // mouseDown (not click) so the field keeps focus and the pick registers
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(display);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 ${
                  i === active ? "bg-cream-100" : ""
                }`}
              >
                <span className="text-taupe-800">{display}</span>
                {kind && (
                  <span className="shrink-0 text-xs text-salamander-700">
                    {kind}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {ambiguous && (
        <span role="alert" className="text-xs text-red-600">
          {t("localityAmbiguous", { value })}
        </span>
      )}
      {unknown && !showList && (
        <span role="status" className="text-xs text-amber-700">
          {t("localityUnknown", { value, county })}
        </span>
      )}
    </div>
  );
}
