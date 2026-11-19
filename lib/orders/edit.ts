import { prisma } from "@/lib/db/client";
import { orderCharges } from "@/lib/shipping";
import { variantPricing } from "@/lib/pricing";
import type { Order, OrderItem } from "@/lib/generated/prisma";

// Editing the products of an order from the admin (a customer phones to add or remove
// something). Only for orders that are still open and have no invoice, because an invoice
// made earlier would stop matching the order.

export type EditableOrder = Pick<
  Order,
  | "status"
  | "completedAt"
  | "invoiceNumber"
  | "invoiceSeries"
  | "invoiceClaimedAt"
>;

// Why the order cannot be edited, in words for the admin; null when it can.
export function editBlockReason(order: EditableOrder): string | null {
  if (order.status === "CANCELED") {
    return "Comanda este anulată, deci nu mai poate fi modificată.";
  }
  if (order.status === "FAILED") {
    return "Plata acestei comenzi a eșuat, deci comanda nu mai poate fi modificată.";
  }
  if (order.status === "PENDING") {
    return "Plata cu cardul nu a fost confirmată încă. Suma de la Netopia este deja stabilită, așa că comanda nu se poate modifica până nu e plătită (sau anulată).";
  }
  if (order.invoiceNumber || order.invoiceClaimedAt) {
    return `Pentru această comandă s-a emis factura${order.invoiceNumber ? ` ${order.invoiceSeries ?? ""} ${order.invoiceNumber}`.trimEnd() : ""}. Dacă schimbi produsele, factura nu ar mai corespunde comenzii. Stornează factura în Oblio și creează o comandă nouă, sau vorbește mai întâi cu contabilul.`;
  }
  if (order.completedAt) {
    return "Comanda este marcată finalizată (de exemplu expediată sau ridicată), deci nu mai poate fi modificată. Dacă ai marcat-o din greșeală, apasă „Redeschide” și apoi o poți edita.";
  }
  return null;
}

export type EditLine = {
  // an existing line: its id and the new quantity (0 removes it)
  itemId?: string;
  // a new line: the product (and variant), quantity and price per piece
  productId?: string;
  variantId?: string | null;
  quantity: number;
  unitPriceCents?: number;
  // colours / remarks for a new line, free text
  note?: string | null;
};

export type EditResult =
  | {
      ok: true;
      order: Order & { items: OrderItem[] };
      summary: string;
      oldTotalCents: number;
      newTotalCents: number;
      changed: boolean;
    }
  | { ok: false; message: string };

const MAX_QUANTITY = 999;
const MAX_PRICE_CENTS = 10_000_000;
const MAX_NEW_LINES = 20;

class EditError extends Error {}

export async function editOrderItems(
  orderId: string,
  lines: EditLine[],
  admin: { id: string; username: string },
): Promise<EditResult> {
  if (!Array.isArray(lines) || lines.length > 100) {
    return { ok: false, message: "Datele trimise nu sunt valide." };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new EditError("Comanda nu mai există.");
      const blocked = editBlockReason(order);
      if (blocked) throw new EditError(blocked);

      const existingById = new Map(order.items.map((i) => [i.id, i]));
      const parts: string[] = [];
      // what each existing line becomes, and the lines to add
      const keep: { item: OrderItem; quantity: number }[] = [];
      const removed: OrderItem[] = [];
      const additions: {
        productId: string;
        productName: string;
        variantName: string | null;
        quantity: number;
        unitPriceCents: number;
        note: string | null;
      }[] = [];

      const seen = new Set<string>();
      for (const line of lines) {
        const quantity = Number(line.quantity);
        if (
          !Number.isInteger(quantity) ||
          quantity < 0 ||
          quantity > MAX_QUANTITY
        ) {
          throw new EditError(`Cantitatea trebuie să fie un număr între 0 și ${MAX_QUANTITY}.`);
        }
        if (line.itemId) {
          const item = existingById.get(line.itemId);
          if (!item || seen.has(item.id)) {
            throw new EditError("Un produs din comandă nu mai există. Reîncarcă pagina.");
          }
          seen.add(item.id);
          if (quantity === 0) removed.push(item);
          else keep.push({ item, quantity });
          continue;
        }
        if (quantity === 0) continue;
        if (additions.length >= MAX_NEW_LINES) {
          throw new EditError(`Poți adăuga cel mult ${MAX_NEW_LINES} produse noi o dată.`);
        }
        const price = Number(line.unitPriceCents);
        if (!Number.isInteger(price) || price < 0 || price > MAX_PRICE_CENTS) {
          throw new EditError("Prețul produsului adăugat nu este valid.");
        }
        const product = line.productId
          ? await tx.product.findUnique({
              where: { id: line.productId },
              include: { translations: true, variants: true },
            })
          : null;
        if (!product) throw new EditError("Un produs adăugat nu mai există.");
        if (product.tieredPricing) {
          throw new EditError(
            `„${product.slug}” are preț pe trepte (după cantitate) și nu se poate adăuga din admin.`,
          );
        }
        const variant = line.variantId
          ? product.variants.find((v) => v.id === line.variantId)
          : null;
        if (product.variants.length > 0 && !variant) {
          throw new EditError(`Alege varianta pentru „${product.slug}”.`);
        }
        const translation =
          product.translations.find((t) => t.locale === order.locale) ??
          product.translations.find((t) => t.locale === "ro");
        additions.push({
          productId: product.id,
          productName: translation?.name ?? product.slug,
          variantName: variant
            ? order.locale === "en"
              ? (variant.nameEn ?? variant.nameRo)
              : variant.nameRo
            : null,
          quantity,
          unitPriceCents: price,
          note: typeof line.note === "string" && line.note.trim()
            ? line.note.trim().slice(0, 200)
            : null,
        });
      }
      // a line that was not mentioned stays as it is
      for (const item of order.items) {
        if (!seen.has(item.id)) keep.push({ item, quantity: item.quantity });
      }

      if (keep.length + additions.length === 0) {
        throw new EditError(
          "Comanda trebuie să rămână cu cel puțin un produs. Pentru a o desființa, folosește „Anulează comanda”.",
        );
      }

      // what changed, in words
      const label = (name: string, variant: string | null) =>
        variant ? `${name} (${variant})` : name;
      for (const item of removed) {
        parts.push(
          `− ${label(item.productNameSnapshot, item.variantName)} × ${item.quantity}`,
        );
      }
      for (const { item, quantity } of keep) {
        if (quantity !== item.quantity) {
          parts.push(
            `${label(item.productNameSnapshot, item.variantName)}: ${item.quantity} → ${quantity} buc.`,
          );
        }
      }
      for (const a of additions) {
        parts.push(
          `+ ${label(a.productName, a.variantName)} × ${a.quantity}, ${(a.unitPriceCents / 100).toFixed(2)} lei/buc.`,
        );
      }

      // stock: the order already took its pieces, so only the difference moves
      const delta = new Map<string, number>();
      const bump = (productId: string, by: number) =>
        delta.set(productId, (delta.get(productId) ?? 0) + by);
      for (const item of removed) bump(item.productId, -item.quantity);
      for (const { item, quantity } of keep) {
        bump(item.productId, quantity - item.quantity);
      }
      for (const a of additions) bump(a.productId, a.quantity);
      for (const [productId, by] of delta) {
        if (by === 0) continue;
        if (by > 0) {
          const inventory = await tx.inventory.findUnique({ where: { productId } });
          const available =
            (inventory?.quantityOnHand ?? 0) - (inventory?.reservedQty ?? 0);
          if (by > available) {
            const name =
              order.items.find((i) => i.productId === productId)
                ?.productNameSnapshot ??
              additions.find((a) => a.productId === productId)?.productName ??
              "produsul";
            throw new EditError(
              `Stoc insuficient pentru „${name}”: mai sunt ${Math.max(0, available)} buc. disponibile, iar tu ai nevoie de încă ${by}.`,
            );
          }
          await tx.inventory.updateMany({
            where: { productId },
            data: { quantityOnHand: { decrement: by } },
          });
        } else {
          await tx.inventory.updateMany({
            where: { productId },
            data: { quantityOnHand: { increment: -by } },
          });
        }
      }

      // the lines
      for (const item of removed) {
        await tx.orderItem.delete({ where: { id: item.id } });
      }
      for (const { item, quantity } of keep) {
        if (quantity !== item.quantity) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { quantity },
          });
        }
      }
      for (const a of additions) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: a.productId,
            productNameSnapshot: a.productName,
            variantName: a.variantName,
            colors: [],
            colorNote: a.note,
            unitPriceCents: a.unitPriceCents,
            quantity: a.quantity,
          },
        });
      }

      // the new totals: shipping and the fees follow the same rules as at the checkout
      const subtotalCents =
        keep.reduce(
          (sum, { item, quantity }) => sum + item.unitPriceCents * quantity,
          0,
        ) + additions.reduce((sum, a) => sum + a.unitPriceCents * a.quantity, 0);
      let removesCodFee = false;
      if (order.discountCode) {
        const code = await tx.discountCode.findUnique({
          where: { code: order.discountCode },
        });
        removesCodFee = code?.removesCodFee ?? false;
      }
      const charges = orderCharges({
        subtotalCents,
        pickup: order.deliveryMethod === "PICKUP",
        cod: order.paymentMethod === "COD",
        code: order.discountCode ? { removesCodFee } : null,
      });

      const claimed = await tx.order.updateMany({
        where: {
          id: order.id,
          status: order.status,
          completedAt: null,
          invoiceNumber: null,
          invoiceClaimedAt: null,
        },
        data: {
          subtotalCents,
          shippingCents: charges.shippingCents,
          codFeeCents: charges.codFeeCents,
          discountCents: order.discountCode ? charges.discountCents : 0,
          totalCents: charges.totalCents,
        },
      });
      if (claimed.count === 0) {
        throw new EditError(
          "Comanda s-a schimbat între timp (alt admin sau o factură). Reîncarcă pagina și încearcă din nou.",
        );
      }

      const summary = parts.join("; ");
      if (summary) {
        await tx.orderChange.create({
          data: {
            orderId: order.id,
            adminUserId: admin.id,
            username: admin.username,
            summary,
            oldTotalCents: order.totalCents,
            newTotalCents: charges.totalCents,
          },
        });
      }
      const fresh = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true },
      });
      return {
        ok: true as const,
        order: fresh,
        summary,
        oldTotalCents: order.totalCents,
        newTotalCents: charges.totalCents,
        changed: summary !== "",
      };
    });
  } catch (err) {
    if (err instanceof EditError) return { ok: false, message: err.message };
    console.error("Could not edit the order", err);
    return {
      ok: false,
      message: "Nu s-a putut salva modificarea. Încearcă din nou.",
    };
  }
}

// The products that can be added to an order, for the edit window.
export type CatalogProduct = {
  id: string;
  name: string;
  priceCents: number;
  variants: { id: string; name: string; priceCents: number }[];
};

export async function getEditCatalog(): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { tieredPricing: false, isActive: true },
    include: {
      translations: { where: { locale: "ro" } },
      variants: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return products
    .map((p) => {
      const pricing = p.variants.length > 0 ? variantPricing(p.variants) : [];
      return {
        id: p.id,
        name: p.translations[0]?.name ?? p.slug,
        priceCents: p.priceCents,
        variants: p.variants.map((v, i) => ({
          id: v.id,
          name: v.nameRo,
          priceCents: pricing[i]?.finalCents ?? v.priceCents,
        })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
}
