import Link from "next/link";
import AdminCard from "@/components/admin/AdminCard";
import { getTrafficReport, type TrafficRow } from "@/lib/admin/traffic";

const PERIODS = [7, 30, 90] as const;

const number = (n: number) => n.toLocaleString("ro-RO");
const dateText = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const regionNames = new Intl.DisplayNames(["ro"], { type: "region" });
function countryName(code: string) {
  if (code === "??") return "Necunoscută";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
const deviceName: Record<string, string> = {
  mobile: "Telefon",
  tablet: "Tabletă",
  desktop: "Calculator",
};

function StatCard({
  label,
  views,
  visitors,
}: {
  label: string;
  views: number;
  visitors: number;
}) {
  return (
    <AdminCard title={label} compact bodyClassName="p-4">
      <p className="font-display text-3xl text-taupe-800">{number(visitors)}</p>
      <p className="text-xs text-taupe-500">vizitatori</p>
      <p className="mt-2 text-sm text-taupe-700">
        {number(views)} {views === 1 ? "pagină vizitată" : "pagini vizitate"}
      </p>
    </AdminCard>
  );
}

function RankTable({
  title,
  rows,
  label,
  empty = "Încă nu sunt date.",
}: {
  title: string;
  rows: TrafficRow[];
  label: (key: string) => string;
  empty?: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <AdminCard title={title} bodyClassName="p-0">
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-taupe-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-cream-200">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex items-center gap-3 px-6 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-taupe-800">
                {label(r.key)}
              </span>
              <span className="text-xs text-taupe-500">
                {Math.round((r.count / total) * 100)}%
              </span>
              <span className="w-14 text-right font-semibold text-taupe-800">
                {number(r.count)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

export default async function TrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ zile?: string }>;
}) {
  const { zile } = await searchParams;
  const days = PERIODS.find((p) => String(p) === zile) ?? 30;
  const report = await getTrafficReport(days);
  const max = Math.max(1, ...report.daily.map((d) => d.views));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-taupe-800">Trafic</h1>
        <div className="inline-flex overflow-hidden rounded-full border border-cream-300 bg-white text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/traffic?zile=${p}`}
              className={`px-4 py-1.5 font-semibold ${
                p === days
                  ? "bg-choc text-cream-50"
                  : "text-taupe-700 hover:bg-cream-100"
              }`}
            >
              {p} zile
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm text-taupe-600">
        {report.since
          ? `Contorul numără din ${dateText(report.since)} (nu are date mai vechi). `
          : "Contorul abia a pornit: nu are încă nicio vizită. "}
        Nu folosește cookie-uri și nu păstrează nimic despre persoane. Vizitele
        tale de admin și roboții nu se numără.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Azi"
          views={report.today.views}
          visitors={report.today.visitors}
        />
        <StatCard
          label="Ieri"
          views={report.yesterday.views}
          visitors={report.yesterday.visitors}
        />
        <StatCard
          label={`Ultimele ${days} zile`}
          views={report.views}
          visitors={report.visitors}
        />
        <AdminCard title="Medie pe zi" compact bodyClassName="p-4">
          <p className="font-display text-3xl text-taupe-800">
            {number(Math.round(report.visitors / days))}
          </p>
          <p className="text-xs text-taupe-500">vizitatori pe zi</p>
          <p className="mt-2 text-sm text-taupe-700">
            {number(Math.round(report.views / days))} pagini vizitate
          </p>
        </AdminCard>
      </div>

      <AdminCard
        title="Pe zile"
        bodyClassName="p-6"
        actions={
          <span className="flex items-center gap-3 text-xs text-cream-100">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cream-300" />
              pagini vizitate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-salamander-500" />
              vizitatori
            </span>
          </span>
        }
      >
        <div
          className="flex h-44 items-end gap-[3px]"
          role="img"
          aria-label="Vizitatori și pagini vizitate pe zile"
        >
          {report.daily.map((d) => (
            <div
              key={d.day}
              title={`${dateText(d.day)}: ${d.visitors} vizitatori, ${d.views} pagini`}
              className="relative flex h-full min-w-0 flex-1 items-end"
            >
              <div
                className="relative w-full rounded-t-sm bg-cream-300"
                style={{ height: `${(d.views / max) * 100}%`, minHeight: d.views ? 2 : 0 }}
              >
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-sm bg-salamander-500"
                  style={{ height: `${d.views ? (d.visitors / d.views) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-taupe-500">
          <span>{dateText(report.daily[0].day)}</span>
          <span>{dateText(report.daily[report.daily.length - 1].day)}</span>
        </div>
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankTable
          title="Pagini vizitate"
          rows={report.pages}
          label={(k) => (k === "/" ? "Pagina de start" : k)}
        />
        <RankTable
          title="De unde vin (vizite)"
          rows={report.sources}
          label={(k) => (k === "direct" ? "Direct (adresă scrisă sau marcaj)" : k)}
        />
        <RankTable title="Țări (vizite)" rows={report.countries} label={countryName} />
        <RankTable
          title="Dispozitiv (vizite)"
          rows={report.devices}
          label={(k) => deviceName[k] ?? k}
        />
      </div>
    </div>
  );
}
