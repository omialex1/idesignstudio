"use client";

import { useState } from "react";
import { openGroups } from "@/components/admin/groups-events";

// The "Categorie" filter of the products list: the main categories, and at the
// end "Grupuri…", which opens the Groups window instead of choosing a value.
export default function CategorySelect({
  mains,
  defaultValue,
  className,
}: {
  mains: { id: string; name: string }[];
  defaultValue: string;
  className: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <select
      name="cat"
      value={value}
      onChange={(e) => {
        if (e.target.value === "__groups") {
          // keep the category that was chosen; the window opens on top
          openGroups();
          return;
        }
        setValue(e.target.value);
      }}
      className={className}
    >
      <option value="">Toate</option>
      {mains.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
      <option value="__groups">Grupuri…</option>
    </select>
  );
}
