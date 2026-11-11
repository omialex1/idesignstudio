import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db/client";

// Visitor counter. It counts, it never identifies: no cookies, and nothing about a
// person is kept. Each page view adds to counters per day; a visitor is counted once
// a day through a hash (secret + day + address + browser) that changes every day and
// is deleted after two days.

const TIME_ZONE = "Europe/Bucharest";

// "2026-11-11" in Romanian time (the day a visit belongs to)
export function romaniaDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

export function dayBefore(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse|headless|monitor|uptime|pingdom|curl|wget|python|java\/|go-http|axios|node-fetch|scrapy|httpclient|okhttp/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

export function deviceOf(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android|phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

// The page without the language and without the query: "/home-lifestyle/baie".
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let path = raw.split(/[?#]/)[0].trim();
  if (!path.startsWith("/")) return null;
  path = path.replace(/^\/(ro|en)(?=\/|$)/, "") || "/";
  path = path.replace(/\/+$/, "") || "/";
  if (path.startsWith("/admin") || path.startsWith("/api")) return null;
  return path.slice(0, 150);
}

// The site a visit came from ("google.com"), "direct" when there is none, null for
// a link from our own pages.
export function sourceOf(referrer: unknown, ownHost: string): string | null {
  if (typeof referrer !== "string" || !referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (!host) return "direct";
    if (host === ownHost.replace(/^www\./, "").toLowerCase()) return null;
    return host.slice(0, 80);
  } catch {
    return "direct";
  }
}

function visitorHash(day: string, address: string, userAgent: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "development";
  return createHmac("sha256", `${secret}:traffic:${day}`)
    .update(`${address}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

const add = (day: string, kind: string, key: string) =>
  prisma.trafficCount.upsert({
    where: { day_kind_key: { day, kind, key } },
    create: { day, kind, key, count: 1 },
    update: { count: { increment: 1 } },
  });

export type Visit = {
  path: string;
  // true on the first page of a visit: then source, country and device are counted too
  first: boolean;
  source: string | null;
  country: string;
  userAgent: string;
  address: string;
};

// Never throws: counting must not be able to break a page.
export async function recordVisit(visit: Visit, now = new Date()) {
  try {
    const day = romaniaDay(now);
    const hash = visitorHash(day, visit.address, visit.userAgent);
    const isNew = await prisma.trafficVisitor.createMany({
      data: [{ day, hash }],
      skipDuplicates: true,
    });
    const writes = [add(day, "views", ""), add(day, "page", visit.path)];
    if (isNew.count === 1) writes.push(add(day, "visitors", ""));
    if (visit.first) {
      if (visit.source) writes.push(add(day, "source", visit.source));
      writes.push(add(day, "country", visit.country));
      writes.push(add(day, "device", deviceOf(visit.userAgent)));
    }
    await prisma.$transaction(writes);
  } catch (error) {
    console.error("Traffic count failed", error);
  }
}

// Visitor hashes older than yesterday are not needed any more.
export async function purgeOldVisitors(now = new Date()) {
  const keepFrom = dayBefore(romaniaDay(now), 1);
  const { count } = await prisma.trafficVisitor.deleteMany({
    where: { day: { lt: keepFrom } },
  });
  return count;
}
