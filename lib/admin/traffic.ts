import { prisma } from "@/lib/db/client";
import { dayBefore, romaniaDay } from "@/lib/traffic";

export type TrafficRow = { key: string; count: number };

export type TrafficReport = {
  days: number;
  // one entry per day of the period, oldest first (days without visits are 0)
  daily: { day: string; views: number; visitors: number }[];
  views: number;
  // the daily counts of visitors added up (someone who comes on two days counts twice)
  visitors: number;
  today: { views: number; visitors: number };
  yesterday: { views: number; visitors: number };
  pages: TrafficRow[];
  sources: TrafficRow[];
  countries: TrafficRow[];
  devices: TrafficRow[];
  // the first day with any count (the counter knows nothing about earlier days)
  since: string | null;
};

const top = (rows: { key: string; count: number }[], limit: number) => {
  const by = new Map<string, number>();
  for (const r of rows) by.set(r.key, (by.get(r.key) ?? 0) + r.count);
  return [...by.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export async function getTrafficReport(days: number): Promise<TrafficReport> {
  const today = romaniaDay();
  const from = dayBefore(today, days - 1);
  const [rows, first] = await Promise.all([
    prisma.trafficCount.findMany({ where: { day: { gte: from } } }),
    prisma.trafficCount.findFirst({
      orderBy: { day: "asc" },
      select: { day: true },
    }),
  ]);

  const perDay = new Map<string, { views: number; visitors: number }>();
  for (const r of rows) {
    if (r.kind !== "views" && r.kind !== "visitors") continue;
    const entry = perDay.get(r.day) ?? { views: 0, visitors: 0 };
    entry[r.kind] += r.count;
    perDay.set(r.day, entry);
  }
  const daily: TrafficReport["daily"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayBefore(today, i);
    daily.push({ day, ...(perDay.get(day) ?? { views: 0, visitors: 0 }) });
  }

  const ofKind = (kind: string) => rows.filter((r) => r.kind === kind);
  return {
    days,
    daily,
    views: daily.reduce((sum, d) => sum + d.views, 0),
    visitors: daily.reduce((sum, d) => sum + d.visitors, 0),
    today: perDay.get(today) ?? { views: 0, visitors: 0 },
    yesterday: perDay.get(dayBefore(today, 1)) ?? { views: 0, visitors: 0 },
    pages: top(ofKind("page"), 15),
    sources: top(ofKind("source"), 10),
    countries: top(ofKind("country"), 10),
    devices: top(ofKind("device"), 3),
    since: first?.day ?? null,
  };
}
