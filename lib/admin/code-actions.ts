"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import { prisma } from "@/lib/db/client";
import { normalizeCode } from "@/lib/discount-codes";

export type CodeInput = {
  // only when making a new code
  code?: string;
  note: string;
  removesCodFee: boolean;
  oneUsePerCustomer: boolean;
  // in lei, empty = no minimum
  minSubtotal: string;
  // YYYY-MM-DD, empty = no limit
  validFrom: string;
  validUntil: string;
  // empty = no limit
  maxUses: string;
};

export type CodeOutcome = { ok: boolean; message: string };

// A date written in the admin (Romanian time): the start or the end of that day.
function bucharestDay(day: string, end: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const guess = new Date(`${day}T${end ? "23:59:59" : "00:00:00"}Z`);
  if (Number.isNaN(guess.getTime())) return null;
  // Romania is UTC+2 or UTC+3 depending on the season
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    timeZoneName: "shortOffset",
  })
    .formatToParts(guess)
    .find((p) => p.type === "timeZoneName")?.value;
  const hours = Number(part?.replace("GMT", "").replace("+", "") || "2");
  return new Date(guess.getTime() - hours * 60 * 60 * 1000);
}

function parseInput(input: CodeInput):
  | {
      ok: true;
      data: {
        note: string | null;
        removesCodFee: boolean;
        oneUsePerCustomer: boolean;
        minSubtotalCents: number;
        validFrom: Date | null;
        validUntil: Date | null;
        maxUses: number | null;
      };
    }
  | { ok: false; message: string } {
  const min = input.minSubtotal.trim()
    ? Number(input.minSubtotal.replace(",", "."))
    : 0;
  if (!Number.isFinite(min) || min < 0 || min > 100000) {
    return { ok: false, message: "Comanda minimă trebuie să fie un număr de lei (sau gol)." };
  }
  let maxUses: number | null = null;
  if (input.maxUses.trim()) {
    maxUses = Number(input.maxUses);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1_000_000) {
      return { ok: false, message: "Numărul maxim de utilizări trebuie să fie un număr întreg, cel puțin 1 (sau gol)." };
    }
  }
  const validFrom = input.validFrom ? bucharestDay(input.validFrom, false) : null;
  const validUntil = input.validUntil ? bucharestDay(input.validUntil, true) : null;
  if ((input.validFrom && !validFrom) || (input.validUntil && !validUntil)) {
    return { ok: false, message: "Data nu este validă." };
  }
  if (validFrom && validUntil && validUntil < validFrom) {
    return { ok: false, message: "Data de sfârșit trebuie să fie după data de început." };
  }
  return {
    ok: true,
    data: {
      note: input.note.trim().slice(0, 200) || null,
      removesCodFee: input.removesCodFee,
      oneUsePerCustomer: input.oneUsePerCustomer,
      minSubtotalCents: Math.round(min * 100),
      validFrom,
      validUntil,
      maxUses,
    },
  };
}

export async function createCodeAction(input: CodeInput): Promise<CodeOutcome> {
  const admin = await requireAdmin();
  const code = normalizeCode(input.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    return {
      ok: false,
      message: "Codul trebuie să aibă 3-30 de caractere: litere, cifre, - sau _ (fără spații).",
    };
  }
  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;
  if (await prisma.discountCode.findUnique({ where: { code } })) {
    return { ok: false, message: `Codul ${code} există deja.` };
  }
  await prisma.discountCode.create({
    data: { code, kind: "FREE_SHIPPING", ...parsed.data },
  });
  await logAdminAction(admin, "Cod de reducere creat", code);
  revalidatePath("/admin/codes");
  return { ok: true, message: `Codul ${code} a fost creat.` };
}

export async function updateCodeAction(
  id: string,
  input: CodeInput,
): Promise<CodeOutcome> {
  const admin = await requireAdmin();
  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;
  const found = await prisma.discountCode.findUnique({ where: { id } });
  if (!found) return { ok: false, message: "Codul nu mai există." };
  await prisma.discountCode.update({ where: { id }, data: parsed.data });
  await logAdminAction(admin, "Cod de reducere modificat", found.code);
  revalidatePath("/admin/codes");
  return { ok: true, message: "Modificările au fost salvate." };
}

export async function setCodeActiveAction(
  id: string,
  isActive: boolean,
): Promise<CodeOutcome> {
  const admin = await requireAdmin();
  const found = await prisma.discountCode.findUnique({ where: { id } });
  if (!found) return { ok: false, message: "Codul nu mai există." };
  await prisma.discountCode.update({ where: { id }, data: { isActive } });
  await logAdminAction(
    admin,
    isActive ? "Cod de reducere pornit" : "Cod de reducere oprit",
    found.code,
  );
  revalidatePath("/admin/codes");
  return { ok: true, message: isActive ? "Codul e activ." : "Codul e oprit." };
}

// Only a code that was never used can be deleted (a used one is kept for the record: stop it).
export async function deleteCodeAction(id: string): Promise<CodeOutcome> {
  const admin = await requireAdmin();
  const found = await prisma.discountCode.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!found) return { ok: false, message: "Codul nu mai există." };
  if (found._count.redemptions > 0) {
    return {
      ok: false,
      message: "Codul a fost folosit, deci nu se poate șterge. Oprește-l în schimb.",
    };
  }
  await prisma.discountCode.delete({ where: { id } });
  await logAdminAction(admin, "Cod de reducere șters", found.code);
  revalidatePath("/admin/codes");
  return { ok: true, message: "Codul a fost șters." };
}
