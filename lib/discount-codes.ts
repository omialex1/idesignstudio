import { createHash, createHmac } from "crypto";
import { prisma } from "@/lib/db/client";
import type { DiscountCode, Prisma } from "@/lib/generated/prisma";

// Discount codes (for now: free shipping, for example LIVRARE0).
// The same person may use a code once: one use per name, account and delivery address.
// Only keyed hashes are kept. The IP address is stored (hashed) but no longer compared: people
// in the same house or office share one, and the codes go to people the studio knows.

export type DbClient = Prisma.TransactionClient | typeof prisma;

export function normalizeCode(raw: unknown): string {
  return typeof raw === "string"
    ? raw.replace(/\s/g, "").toUpperCase().slice(0, 40)
    : "";
}

function pepper() {
  return (
    process.env.CUSTOMER_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    "discount-code"
  );
}

export function ipHash(ip: string): string {
  return createHmac("sha256", pepper())
    .update(`discount-ip|${ip.trim().toLowerCase()}`)
    .digest("hex");
}

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// "Popescu Ion" and "ion  popescu" are the same person
export function nameKey(firstName: string, lastName: string): string {
  const words = plain(`${firstName} ${lastName}`)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort();
  return createHash("sha256").update(words.join(" ")).digest("hex");
}

const ADDRESS_NOISE = new Set([
  "strada", "str", "nr", "numarul", "numar", "bloc", "bl", "scara", "sc",
  "etaj", "et", "apartament", "ap", "ap.", "judetul", "jud", "municipiul",
  "mun", "orasul", "oras", "comuna", "com", "satul", "sat",
]);

// Street, number, locality and county, without the small words people write differently.
export function addressKey(
  addressLine: string,
  city: string,
  county: string,
): string {
  const words = plain(`${addressLine} ${city} ${county}`)
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !ADDRESS_NOISE.has(w));
  return createHash("sha256").update(words.join(" ")).digest("hex");
}

export type CodeError =
  | "invalid"
  | "not_started"
  | "expired"
  | "min_subtotal"
  | "limit_reached";

export type CodeCheck =
  | { ok: true; code: DiscountCode }
  | { ok: false; error: CodeError; minSubtotalCents?: number };

// Is the code usable at all (exists, switched on, in its dates, order big enough, not used up).
// `subtotalCents` is optional: the check at the end of the order always passes it.
export async function checkCode(
  db: DbClient,
  rawCode: unknown,
  subtotalCents?: number,
): Promise<CodeCheck> {
  const value = normalizeCode(rawCode);
  if (!value) return { ok: false, error: "invalid" };
  const code = await db.discountCode.findUnique({ where: { code: value } });
  if (!code || !code.isActive) return { ok: false, error: "invalid" };

  const now = new Date();
  if (code.validFrom && code.validFrom > now) {
    return { ok: false, error: "not_started" };
  }
  if (code.validUntil && code.validUntil < now) {
    return { ok: false, error: "expired" };
  }
  if (
    subtotalCents !== undefined &&
    code.minSubtotalCents > 0 &&
    subtotalCents < code.minSubtotalCents
  ) {
    return {
      ok: false,
      error: "min_subtotal",
      minSubtotalCents: code.minSubtotalCents,
    };
  }
  if (code.maxUses !== null) {
    const used = await activeUses(db, code.id);
    if (used >= code.maxUses) return { ok: false, error: "limit_reached" };
  }
  return { ok: true, code };
}

// Uses that count: orders that are paid or cash on delivery, and card orders that are still
// waiting for the payment (for an hour). A failed, canceled or abandoned order gives the use back.
function activeOrderFilter(): Prisma.OrderWhereInput {
  return {
    OR: [
      { status: { in: ["COD", "PAID"] } },
      {
        status: "PENDING",
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    ],
  };
}

export async function activeUses(db: DbClient, codeId: string) {
  return db.discountRedemption.count({
    where: { codeId, order: activeOrderFilter() },
  });
}

export type Reason = "name" | "account" | "address";

export type Duplicate = { reasons: Reason[]; matchedOrderIds: string[] };

// Has this person (by name, account or delivery address) already used the code?
// With only some of the facts known (the preview at "Aplică"), only those are compared.
export async function findDuplicate(
  db: DbClient,
  codeId: string,
  who: {
    // kept for the record only, not compared
    ipHash?: string;
    nameKey?: string;
    addressKey?: string;
    customerId?: string | null;
  },
): Promise<Duplicate | null> {
  const rows = await db.discountRedemption.findMany({
    where: { codeId, order: activeOrderFilter() },
    select: {
      orderId: true,
      ipHash: true,
      nameKey: true,
      addressKey: true,
      customerId: true,
    },
  });
  const reasons = new Set<Reason>();
  const matched = new Set<string>();
  for (const r of rows) {
    const hits: Reason[] = [];
    if (who.nameKey && r.nameKey === who.nameKey) hits.push("name");
    if (who.addressKey && r.addressKey === who.addressKey) hits.push("address");
    if (who.customerId && r.customerId === who.customerId) hits.push("account");
    for (const h of hits) reasons.add(h);
    if (hits.length > 0) matched.add(r.orderId);
  }
  if (reasons.size === 0) return null;
  return { reasons: [...reasons], matchedOrderIds: [...matched] };
}

// One code at a time while an order that uses it is being checked and saved, so two orders
// at the same moment cannot both pass.
export async function lockCode(tx: Prisma.TransactionClient, code: string) {
  // the lock function returns void, which the driver cannot read: select a plain number instead
  await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`discount:${code}`}))) AS lock_row`;
}

export const REASON_LABELS_RO: Record<Reason, string> = {
  name: "același nume",
  account: "același cont",
  address: "aceeași adresă de livrare",
};
