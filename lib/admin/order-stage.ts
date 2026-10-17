import { isUnfinishedOrder } from "@/lib/admin/unfinished";

// The three groups Bea filters orders by, plus the ones nobody acts on.
export type OrderStage = "procesare" | "finalizata" | "anulata" | "neterminata";

export const STAGE_LABELS: Record<Exclude<OrderStage, "neterminata">, string> = {
  procesare: "În procesare",
  finalizata: "Finalizată",
  anulata: "Anulată",
};

type StageOrder = {
  status: string;
  completedAt: Date | null;
};

export function orderStage(order: StageOrder): OrderStage {
  if (order.status === "CANCELED") return "anulata";
  if (order.status === "COD" || order.status === "PAID") {
    return order.completedAt ? "finalizata" : "procesare";
  }
  // unpaid card order or failed payment
  return "neterminata";
}

// Calendar date in Romanian time, whatever the server's time zone is.
const dateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function romanianDate(date: Date): { y: number; m: number; d: number } {
  const parts = dateParts.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export type OrderFilter = {
  stage: Exclude<OrderStage, "neterminata"> | null;
  year: number | null;
  month: number | null;
  day: number | null;
  // also show failed / abandoned card payments
  showUnfinished: boolean;
};

function toNumber(value: string | undefined, min: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function parseOrderFilter(params: {
  stare?: string;
  an?: string;
  luna?: string;
  zi?: string;
  all?: string;
}): OrderFilter {
  const stage =
    params.stare === "procesare" ||
    params.stare === "finalizata" ||
    params.stare === "anulata"
      ? params.stare
      : null;
  return {
    stage,
    year: toNumber(params.an, 2000, 2100),
    month: toNumber(params.luna, 1, 12),
    day: toNumber(params.zi, 1, 31),
    showUnfinished: params.all === "1",
  };
}

export function filterOrders<
  T extends StageOrder & { createdAt: Date },
>(orders: T[], filter: OrderFilter): T[] {
  return orders.filter((o) => {
    const stage = orderStage(o);
    if (filter.stage) {
      if (stage !== filter.stage) return false;
    } else if (stage === "neterminata") {
      // "All": only hide the old unfinished ones, as before
      if (!filter.showUnfinished && isUnfinishedOrder(o as never)) return false;
    }
    if (filter.year || filter.month || filter.day) {
      const { y, m, d } = romanianDate(o.createdAt);
      if (filter.year && y !== filter.year) return false;
      if (filter.month && m !== filter.month) return false;
      if (filter.day && d !== filter.day) return false;
    }
    return true;
  });
}
