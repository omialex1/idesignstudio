"use client";

import type { GroupProduct } from "@/lib/admin/groups";

export type CategoryHit = {
  id: string;
  kind: "main" | "sub";
  name: string;
  count: number;
};
export type Editor = {
  // null while it is a new, unsaved group
  id: string | null;
  name: string;
  typeId: string;
  // 1..100 as typed ("" for none)
  discount: string;
  // a new random order on the site at every visit
  shuffle: boolean;
  // discount: applied on the site, and the period (local date-time text);
  // without a period the discount has no end
  discountLive: boolean;
  periodOn: boolean;
  startsAt: string;
  endsAt: string;
  // the discount chosen for products in several groups: a group id, "self" (this
  // group) or null (the biggest); missing: unchanged
  choices: Record<string, string | null>;
  maxItems: string;
  // in the order they were chosen
  items: GroupProduct[];
};

// "2026-11-27T00:00" (local time) from an ISO date, and back
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const fromLocalInput = (text: string): string | null => {
  const d = text ? new Date(text) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

export const money = (cents: number) =>
  `${(cents / 100).toFixed(2).replace(".", ",")} RON`;

export const btn =
  "rounded-full border border-cream-300 bg-cream-100 px-4 py-1.5 text-sm font-semibold text-taupe-800 transition-colors hover:bg-cream-200 disabled:cursor-not-allowed disabled:opacity-50";
export const btnMain =
  "rounded-full bg-salamander-500 px-4 py-1.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger =
  "rounded-full border border-red-200 bg-white px-4 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50";

export function Thumb({
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
export function Info({ product }: { product: GroupProduct }) {
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
export function ProductName({
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
export function ProductPhoto({ product }: { product: GroupProduct }) {
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

// What the period means right now, in words.
export function periodStatus(
  e: Pick<Editor, "discountLive" | "periodOn" | "startsAt" | "endsAt">,
) {
  if (!e.discountLive) return "Oprit: prețurile din magazin nu se schimbă.";
  if (!e.periodOn) return "Pornit, fără dată de sfârșit.";
  const now = Date.now();
  const from = e.startsAt ? new Date(e.startsAt).getTime() : null;
  const to = e.endsAt ? new Date(e.endsAt).getTime() : null;
  if (from !== null && now < from)
    return "Pornit, dar așteaptă începutul perioadei.";
  if (to !== null && now >= to)
    return "Perioada s-a încheiat: discountul nu se mai aplică.";
  return "Pornit și în perioadă: se aplică acum.";
}

// The discount column of a product in the group: its own on/off switch and, when
// it is also in another group with a discount, which of them applies.
export function DiscountCell({
  product,
  groupId,
  groupPercent,
  choice,
  onLive,
  onChoice,
}: {
  product: GroupProduct;
  groupId: string | null;
  groupPercent: number | null;
  choice: string | null | undefined;
  onLive: (live: boolean | null) => void;
  onChoice: (value: string | null) => void;
}) {
  const raw = choice !== undefined ? choice : product.chosenGroupId;
  const current = raw === null ? "auto" : raw === groupId ? "self" : raw;
  const field =
    "rounded-lg border border-cream-300 bg-white px-2 py-1 text-xs text-taupe-800";
  return (
    <div className="flex min-w-44 flex-col gap-1.5">
      <select
        value={product.live === null ? "group" : product.live ? "on" : "off"}
        onChange={(e) =>
          onLive(e.target.value === "group" ? null : e.target.value === "on")
        }
        aria-label={`Discount pentru ${product.name}`}
        className={field}
      >
        <option value="group">Urmează grupul</option>
        <option value="on">Pornit pentru acest produs</option>
        <option value="off">Oprit pentru acest produs</option>
      </select>
      {product.otherDiscounts.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-1.5">
          <span className="text-[11px] font-semibold text-amber-900">
            ⚠ Și în{" "}
            {product.otherDiscounts
              .map((o) => `„${o.name}” −${o.percent}%`)
              .join(", ")}
          </span>
          <select
            value={current}
            onChange={(e) =>
              onChoice(e.target.value === "auto" ? null : e.target.value)
            }
            aria-label={`Ce discount se aplică la ${product.name}`}
            className={field}
          >
            <option value="auto">Se aplică cel mai mare (automat)</option>
            <option value="self">
              Se aplică acest grup{groupPercent ? ` (−${groupPercent}%)` : ""}
            </option>
            {product.otherDiscounts.map((o) => (
              <option key={o.groupId} value={o.groupId}>
                Se aplică „{o.name}” (−{o.percent}%)
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
