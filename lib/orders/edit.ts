import { prisma } from "@/lib/db/client";
import { orderCharges } from "@/lib/shipping";
import { variantPricing } from "@/lib/pricing";
import { activeDiscounts } from "@/lib/discounts";
import { discountedCents } from "@/lib/discount-math";
import { ALL_COMPONENTS_ID, DEFAULT_COMPONENT_ID, MAX_COLORS } from "@/lib/colors";
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
  // the colour picked for each piece (componentId = the piece, or "all" for the whole set)
  colorChoices?: { componentId: string; colors: string[] }[];
  // extra remarks for a new line, free text
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
        colors: string[];
        colorChoices: unknown;
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
              include: {
                translations: true,
                variants: true,
                components: true,
                category: true,
              },
            })
          : null;
        if (!product) throw new EditError("Un produs adăugat nu mai există.");
        const productLabel = (
          product.translations.find((t) => t.locale === "ro")?.name ?? product.slug
        ).split(" – ")[0];
        if (product.tieredPricing) {
          throw new EditError(
            `„${productLabel}” are preț pe trepte (după cantitate) și nu se poate adăuga din admin.`,
          );
        }
        const variant = line.variantId
          ? product.variants.find((v) => v.id === line.variantId)
          : null;
        if (product.variants.length > 0 && !variant) {
          throw new EditError(`Alege varianta pentru „${productLabel}”.`);
        }
        const translation =
          product.translations.find((t) => t.locale === order.locale) ??
          product.translations.find((t) => t.locale === "ro");

        // the colours, checked like at the checkout: one per piece (or one for the whole set)
        const palette = new Map<string, { ro: string; en: string }>();
        if (product.hasColorOptions && product.category.mainCategoryId) {
          const rows = await tx.color.findMany({
            where: {
              mainCategoryId: product.category.mainCategoryId,
              isActive: true,
              mainCategory: { usesColors: true },
            },
          });
          for (const c of rows) {
            if (!product.excludedColors.includes(c.slug)) {
              palette.set(c.slug, { ro: c.nameRo, en: c.nameEn });
            }
          }
        }
        const pieces = product.components.filter((c) =>
          variant ? c.variantId === variant.id : !c.variantId,
        );
        const expected =
          palette.size > 0
            ? pieces.length > 0
              ? pieces.map((c) => ({
                  id: c.id,
                  name: order.locale === "en" ? (c.nameEn ?? c.nameRo) : c.nameRo,
                }))
              : [{ id: DEFAULT_COMPONENT_ID, name: null as string | null }]
            : [];
        const labelsFor = (ids: string[]) =>
          Object.fromEntries(ids.map((id) => [id, palette.get(id)!]));
        const picked = Array.isArray(line.colorChoices) ? line.colorChoices : [];
        const orderChoices: {
          component: string | null;
          colors: string[];
          labels: Record<string, { ro: string; en: string }>;
        }[] = [];
        const valid = (choice?: { colors: string[] }) =>
          !!choice &&
          choice.colors.length >= 1 &&
          choice.colors.length <= MAX_COLORS &&
          choice.colors.every((id) => palette.has(id));
        if (expected.length > 0) {
          const whole = picked.find((c) => c.componentId === ALL_COMPONENTS_ID);
          if (expected.length >= 2 && whole) {
            if (!valid(whole)) {
              throw new EditError(`Alege culoarea pentru „${productLabel}”.`);
            }
            orderChoices.push({
              component: order.locale === "en" ? "Whole set" : "Tot setul",
              colors: whole.colors,
              labels: labelsFor(whole.colors),
            });
          } else {
            for (const piece of expected) {
              const choice = picked.find((c) => c.componentId === piece.id);
              if (!valid(choice)) {
                throw new EditError(
                  `Alege culoarea${piece.name ? ` pentru „${piece.name}”` : ""} la „${productLabel}”.`,
                );
              }
              orderChoices.push({
                component: piece.name,
                colors: choice!.colors,
                labels: labelsFor(choice!.colors),
              });
            }
          }
        }
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
          colors: orderChoices.flatMap((c) => c.colors),
          colorChoices: orderChoices,
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
            colors: a.colors,
            colorChoices: a.colorChoices as object,
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

// The products that can be added to an order, for the edit window, with the price as the site
// shows it (variant price and any promotion in force) and the colours the product offers.
export type CatalogColor = {
  id: string;
  name: string;
  hex: string;
  swatchUrl: string | null;
};

export type CatalogPiece = { id: string; name: string | null };

export type CatalogProduct = {
  id: string;
  // the short title, as on the site
  name: string;
  // the price on the site now (with the promotion, if there is one)
  priceCents: number;
  // the price before the promotion, when there is one
  fullPriceCents: number | null;
  promoLabel: string | null;
  variants: {
    id: string;
    name: string;
    priceCents: number;
    fullPriceCents: number | null;
    // the pieces of this variant, each with its own colour
    pieces: CatalogPiece[];
  }[];
  // the pieces of a product without variants
  pieces: CatalogPiece[];
  colors: CatalogColor[];
};

export async function getEditCatalog(): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { tieredPricing: false, isActive: true },
    include: {
      translations: { where: { locale: "ro" } },
      variants: true,
      components: { orderBy: { sortOrder: "asc" } },
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const discounts = await activeDiscounts(products.map((p) => p.id));
  const palettes = await prisma.color.findMany({
    where: { isActive: true, mainCategory: { usesColors: true } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const paletteByMain = new Map<string, CatalogColor[]>();
  for (const c of palettes) {
    paletteByMain.set(c.mainCategoryId, [
      ...(paletteByMain.get(c.mainCategoryId) ?? []),
      {
        id: c.slug,
        name: c.nameRo,
        hex: c.hex,
        swatchUrl: c.swatchImage ? `/colors/${c.slug}.webp` : null,
      },
    ]);
  }

  return products
    .map((p) => {
      const discount = discounts.get(p.id);
      // the price on the site: the regular price, then the promotion on top
      const priced = (regular: number) => ({
        priceCents: discount ? discountedCents(regular, discount.percent) : regular,
        fullPriceCents: discount ? regular : null,
      });
      const pricing = p.variants.length > 0 ? variantPricing(p.variants) : [];
      const main = p.category.mainCategoryId ?? "";
      return {
        id: p.id,
        name: (p.translations[0]?.name ?? p.slug).split(" – ")[0],
        ...priced(p.priceCents),
        promoLabel: discount ? (discount.label ?? `−${discount.percent}%`) : null,
        variants: p.variants.map((v, i) => ({
          id: v.id,
          name: v.nameRo,
          ...priced(pricing[i]?.finalCents ?? v.priceCents),
          pieces: p.components
            .filter((c) => c.variantId === v.id)
            .map((c) => ({ id: c.id, name: c.nameRo })),
        })),
        pieces: p.components
          .filter((c) => !c.variantId)
          .map((c) => ({ id: c.id, name: c.nameRo })),
        colors: p.hasColorOptions
          ? (paletteByMain.get(main) ?? []).filter(
              (c) => !p.excludedColors.includes(c.id),
            )
          : [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
}
