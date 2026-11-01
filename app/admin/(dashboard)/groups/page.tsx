import Link from "next/link";
import AdminCard from "@/components/admin/AdminCard";
import TypeBadge from "@/components/admin/TypeBadge";
import { prisma } from "@/lib/db/client";
import { listGroupTypes } from "@/lib/admin/group-types";
import { matchesAllWords, queryWords } from "@/lib/search";

const selectClass =
  "rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

type Status = "live" | "off" | "waiting" | "ended";

const STATUS_LABEL: Record<Status, string> = {
  live: "LIVE",
  off: "Oprit",
  waiting: "Programat",
  ended: "Perioadă încheiată",
};
const STATUS_CLASS: Record<Status, string> = {
  live: "bg-red-600 text-white",
  off: "bg-cream-200 text-taupe-700",
  waiting: "bg-sky-100 text-sky-800",
  ended: "bg-amber-200 text-amber-900",
};

const dateText = (d: Date) =>
  d.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tip?: string; stare?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const tip = params.tip ?? "";
  const stare = (["live", "off", "waiting", "ended"] as const).find(
    (s) => s === params.stare,
  );

  const types = await listGroupTypes();
  const groups = await prisma.productGroup.findMany({
    orderBy: { name: "asc" },
    include: {
      type: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          productId: true,
          product: {
            select: {
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  // products that are in more than one group with a discount
  const discountGroupsOf = new Map<string, Set<string>>();
  for (const g of groups) {
    if (!g.type?.hasDiscount || !(g.discountPercent && g.discountPercent > 0)) continue;
    for (const item of g.items) {
      const set = discountGroupsOf.get(item.productId) ?? new Set<string>();
      set.add(g.id);
      discountGroupsOf.set(item.productId, set);
    }
  }

  const now = new Date();
  const rows = groups
    .map((g) => {
      const hasDiscount = !!g.type?.hasDiscount;
      let status: Status | null = null;
      if (hasDiscount) {
        if (!g.discountLive) status = "off";
        else if (g.startsAt && g.startsAt > now) status = "waiting";
        else if (g.endsAt && g.endsAt <= now) status = "ended";
        else status = "live";
      }
      const conflicts = hasDiscount
        ? g.items.filter((i) => (discountGroupsOf.get(i.productId)?.size ?? 0) > 1).length
        : 0;
      return { g, status, conflicts };
    })
    .filter(({ g, status }) => {
      const words = queryWords(q);
      if (words.length > 0 && !matchesAllWords(words, g.name)) return false;
      if (tip && g.typeId !== tip) return false;
      if (stare && status !== stare) return false;
      return true;
    });
  const filtered = Boolean(q || tip || stare);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-taupe-800">Grupuri</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/groups/types"
            className="rounded-full border border-cream-300 bg-cream-100 px-5 py-2 text-sm font-semibold text-taupe-800 hover:bg-cream-200"
          >
            Tipuri de grup
          </Link>
          {/* the kind comes first: it decides which settings the group has */}
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-salamander-600">
              + Grup nou ▾
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-cream-300 bg-white text-sm shadow-lg">
              <p className="bg-cream-50 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-taupe-500 uppercase">
                Ce tip de grup?
              </p>
              {types.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/groups/new?tip=${t.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-cream-50"
                >
                  <b>{t.name}</b>
                  <span className="text-xs text-taupe-500">
                    {t.showOnSite ? "apare pe site" : t.hasDiscount ? "cu discount" : "intern"}
                  </span>
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>

      <AdminCard
        title="Căutare și filtre"
        bodyClassName="p-4"
        actions={
          <span className="text-sm text-cream-100">
            {rows.length === 1 ? "1 grup" : `${rows.length} grupuri`}
            {filtered ? " după filtre" : ""}
          </span>
        }
      >
        <form method="get" role="search" className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-taupe-500">
            Caută
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Numele grupului"
              className={selectClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Tip
            <select name="tip" defaultValue={tip} className={selectClass}>
              <option value="">Toate</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-taupe-500">
            Stare discount
            <select name="stare" defaultValue={stare ?? ""} className={selectClass}>
              <option value="">Toate</option>
              <option value="live">LIVE</option>
              <option value="waiting">Programat</option>
              <option value="ended">Perioadă încheiată</option>
              <option value="off">Oprit</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
          >
            Aplică
          </button>
          {filtered && (
            <Link
              href="/admin/groups"
              className="py-2 text-sm font-medium text-salamander-600 hover:underline"
            >
              Resetează
            </Link>
          )}
        </form>
      </AdminCard>

      <AdminCard title="Grupuri" bodyClassName="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-taupe-500">
            {filtered
              ? "Niciun grup pentru filtrele alese."
              : "Încă niciun grup. Apasă „+ Grup nou”."}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cream-200 text-taupe-500">
              <tr>
                <th className="px-4 py-3 font-medium">Grup</th>
                <th className="px-4 py-3 font-medium">Tip</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Stare</th>
                <th className="px-4 py-3 font-medium">Produse</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ g, status, conflicts }) => (
                <tr key={g.id} className="border-b border-cream-200 last:border-0">
                  <td className="px-4 py-3 font-medium text-taupe-800">
                    <Link href={`/admin/groups/${g.id}`} className="hover:text-salamander-600 hover:underline">
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {g.type ? (
                      <TypeBadge type={g.type} />
                    ) : (
                      <span className="text-taupe-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {g.type?.hasDiscount && g.discountPercent ? (
                      <span className="font-semibold text-taupe-800">−{g.discountPercent}%</span>
                    ) : (
                      <span className="text-taupe-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {status ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_CLASS[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                        {g.discountLive && (g.startsAt || g.endsAt) && (
                          <span className="text-xs text-taupe-500">
                            {g.startsAt ? `din ${dateText(g.startsAt)}` : ""}
                            {g.startsAt && g.endsAt ? " " : ""}
                            {g.endsAt ? `până la ${dateText(g.endsAt)}` : ""}
                          </span>
                        )}
                        {status === "ended" && (
                          <span className="text-xs font-medium text-amber-800">
                            Încă bifat „Aplică pe site”: bifa se poate scoate.
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-taupe-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {/* photos side by side (never overlapping), the count under them */}
                    <div className="flex flex-col items-start gap-2">
                      <span className="flex gap-1.5">
                        {g.items.slice(0, 4).map((item) => {
                          const url = item.product.images[0]?.url;
                          return url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={item.productId}
                              src={url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg border border-cream-200 object-cover"
                            />
                          ) : (
                            <span
                              key={item.productId}
                              className="h-10 w-10 shrink-0 rounded-lg border border-cream-200 bg-cream-200"
                            />
                          );
                        })}
                      </span>
                      <span className="rounded-full bg-cream-200 px-3 py-1 text-sm font-semibold whitespace-nowrap text-taupe-800">
                        {g.items.length} {g.items.length === 1 ? "produs" : "produse"}
                      </span>
                    </div>
                    {conflicts > 0 && (
                      <p className="mt-1 text-xs font-medium text-amber-800">
                        ⚠ {conflicts} {conflicts === 1 ? "produs e" : "produse sunt"} și în alt grup cu discount
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/groups/${g.id}`}
                      className="rounded-full border border-cream-300 bg-cream-100 px-4 py-1.5 text-sm font-semibold text-taupe-800 hover:bg-cream-200"
                    >
                      Editează
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </div>
  );
}
