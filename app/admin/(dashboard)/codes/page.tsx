import AdminCard from "@/components/admin/AdminCard";
import CodeForm, { CodeRowButtons } from "@/components/admin/CodeForm";
import { prisma } from "@/lib/db/client";
import { activeUses, REASON_LABELS_RO, type Reason } from "@/lib/discount-codes";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const day = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
// the value of a date field (YYYY-MM-DD, Romanian time)
const dateValue = (d: Date | null) =>
  d ? d.toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" }) : "";

export default async function AdminCodesPage() {
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      redemptions: {
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              status: true,
              totalCents: true,
              currency: true,
            },
          },
        },
      },
      flags: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  const uses = new Map<string, number>();
  for (const c of codes) uses.set(c.id, await activeUses(prisma, c.id));
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Coduri de reducere</h1>
      <p className="-mt-3 text-sm text-taupe-500">
        Codurile pe care clientul le scrie la finalul comenzii („Ai un cod?”). Acum există un
        singur tip: transport gratuit.
      </p>

      <AdminCard title="Cod nou">
        <CodeForm />
      </AdminCard>

      {codes.length === 0 && (
        <p className="text-sm text-taupe-500">Nu există niciun cod încă.</p>
      )}

      {codes.map((c) => {
        const expired = c.validUntil !== null && c.validUntil < now;
        const notYet = c.validFrom !== null && c.validFrom > now;
        const used = uses.get(c.id) ?? 0;
        const state = !c.isActive
          ? { label: "Oprit", cls: "bg-taupe-100 text-taupe-700" }
          : expired
            ? { label: "Expirat", cls: "bg-red-100 text-red-700" }
            : notYet
              ? { label: "Încă nevalabil", cls: "bg-amber-100 text-amber-800" }
              : c.maxUses !== null && used >= c.maxUses
                ? { label: "Epuizat", cls: "bg-red-100 text-red-700" }
                : { label: "Activ", cls: "bg-green-100 text-green-800" };
        return (
          <AdminCard
            key={c.id}
            title={
              <span className="flex flex-wrap items-center gap-3">
                <span className="font-mono tracking-wide">{c.code}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold ${state.cls}`}
                >
                  {state.label}
                </span>
              </span>
            }
            actions={
              <CodeRowButtons
                id={c.id}
                isActive={c.isActive}
                canDelete={c.redemptions.length === 0}
              />
            }
          >
            <div className="flex flex-col gap-5 text-sm text-taupe-700">
              <ul className="grid gap-1 text-xs text-taupe-600 sm:grid-cols-2">
                <li>Transport: gratuit</li>
                <li>Taxa de ramburs: {c.removesCodFee ? "scăzută și ea" : "rămâne"}</li>
                <li>
                  Comandă minimă:{" "}
                  {c.minSubtotalCents > 0 ? formatPrice(c.minSubtotalCents, "RON", "ro") : "fără"}
                </li>
                <li>
                  Utilizări: {used}
                  {c.maxUses !== null ? ` din ${c.maxUses}` : " (fără limită)"}
                </li>
                <li>
                  Valabil:{" "}
                  {c.validFrom ? `de la ${day.format(c.validFrom)}` : "de la început"}
                  {c.validUntil ? `, până la ${day.format(c.validUntil)}` : ", fără dată de sfârșit"}
                </li>
                <li>
                  O singură folosire pe persoană: {c.oneUsePerCustomer ? "da" : "nu"}
                </li>
                {c.note && <li className="sm:col-span-2">Notă: {c.note}</li>}
              </ul>

              <details className="rounded-lg border border-cream-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-taupe-800">
                  Modifică regulile codului
                </summary>
                <div className="mt-4">
                  <CodeForm
                    id={c.id}
                    initial={{
                      note: c.note ?? "",
                      removesCodFee: c.removesCodFee,
                      oneUsePerCustomer: c.oneUsePerCustomer,
                      minSubtotal:
                        c.minSubtotalCents > 0 ? String(c.minSubtotalCents / 100) : "",
                      validFrom: dateValue(c.validFrom),
                      validUntil: dateValue(c.validUntil),
                      maxUses: c.maxUses !== null ? String(c.maxUses) : "",
                    }}
                  />
                </div>
              </details>

              <div>
                <h3 className="mb-2 font-semibold text-taupe-800">
                  Comenzi care au folosit codul ({c.redemptions.length})
                </h3>
                {c.redemptions.length === 0 ? (
                  <p className="text-xs text-taupe-500">Încă nu l-a folosit nimeni.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-xs">
                    {c.redemptions.map((r) => (
                      <li key={r.id} className="flex flex-wrap gap-x-3 text-taupe-600">
                        <span className="font-mono">#{r.order.id.slice(0, 8)}</span>
                        <span className="text-taupe-800">
                          {r.order.firstName} {r.order.lastName}
                        </span>
                        <span>{dateTime.format(r.createdAt)}</span>
                        <span>{formatPrice(r.order.totalCents, r.order.currency, "ro")}</span>
                        <span>{r.order.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-taupe-800">
                  Încercări blocate ({c.flags.length})
                </h3>
                {c.flags.length === 0 ? (
                  <p className="text-xs text-taupe-500">
                    Nimeni nu a încercat să-l folosească a doua oară.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 text-xs">
                    {c.flags.map((f) => (
                      <li key={f.id} className="flex flex-wrap gap-x-3 text-taupe-600">
                        <span>{dateTime.format(f.createdAt)}</span>
                        <span className="text-taupe-800">
                          {f.attemptName} ({f.attemptEmail})
                        </span>
                        <span className="font-medium text-red-700">
                          {f.reasons.map((r) => REASON_LABELS_RO[r as Reason] ?? r).join(", ")}
                        </span>
                        {f.matchedOrderIds.length > 0 && (
                          <span>
                            comenzi anterioare:{" "}
                            {f.matchedOrderIds.map((id) => `#${id.slice(0, 8)}`).join(", ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </AdminCard>
        );
      })}
    </div>
  );
}
