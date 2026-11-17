"use client";

import { useEffect, useId, useState } from "react";

// The names of the variants as they are typed in the product form travel to the photo
// titles through this message, so the title field can offer them while someone types
// (a photo titled exactly like a variant is shown on the product page when that variant
// is picked).
export const VARIANT_NAMES_EVENT = "admin-variant-names";

// The variant names to offer: the ones the product already has, then every change made
// in the form (even before saving).
export function useVariantNames(initial: string[]) {
  const [names, setNames] = useState(initial);
  useEffect(() => {
    function onNames(e: Event) {
      setNames((e as CustomEvent<string[]>).detail);
    }
    window.addEventListener(VARIANT_NAMES_EVENT, onNames);
    return () => window.removeEventListener(VARIANT_NAMES_EVENT, onNames);
  }, []);
  return names;
}

// A browser list of suggestions for a text field: give the id to the field as `list`.
export function useVariantListId() {
  return `variant-names-${useId().replace(/:/g, "")}`;
}

export default function VariantNameList({
  id,
  names,
}: {
  id: string;
  names: string[];
}) {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  return (
    <datalist id={id}>
      {unique.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  );
}
