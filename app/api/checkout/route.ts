import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import { startNetopiaPayment } from "@/lib/netopia";
import { sendOrderEmails } from "@/lib/orders/emails";
import { COD_FEE_CENTS, calculateShippingCents } from "@/lib/shipping";
import {
  DEFAULT_COMPONENT_ID,
  MAX_COLORS,
  MAX_COLOR_NOTE_LENGTH,
  isColorId,
} from "@/lib/colors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CUI_PATTERN = /^(RO)?\d{2,10}$/;
const MAX_QUANTITY_PER_ITEM = 20;
const MAX_DISTINCT_ITEMS = 50;

class OutOfStockError extends Error {
  constructor(public productId: string) {
    super("out_of_stock");
  }
}

type ColorChoiceInput = { componentId: string; colors: string[] };

// Returns null when the client sent something malformed.
function parseColorChoices(value: unknown): ColorChoiceInput[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 10) return null;
  const choices: ColorChoiceInput[] = [];
  for (const raw of value) {
    const componentId = clean(raw?.componentId, 60);
    const colors: unknown = raw?.colors;
    if (
      !componentId ||
      !Array.isArray(colors) ||
      colors.length > MAX_COLORS ||
      !colors.every(isColorId) ||
      new Set(colors).size !== colors.length ||
      choices.some((c) => c.componentId === componentId)
    ) {
      return null;
    }
    choices.push({ componentId, colors: colors as string[] });
  }
  return choices;
}

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizePhone(raw: string): string | null {
  let phone = raw.replace(/[\s().-]/g, "");
  if (phone.startsWith("0040")) phone = `+40${phone.slice(4)}`;
  else if (phone.startsWith("07")) phone = `+40${phone.slice(1)}`;
  return /^\+?\d{9,15}$/.test(phone) ? phone : null;
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "ro";

  const customer = {
    firstName: clean(body.customer?.firstName, 80),
    lastName: clean(body.customer?.lastName, 80),
    email: clean(body.customer?.email, 200).toLowerCase(),
    phone: normalizePhone(clean(body.customer?.phone, 30)),
    addressLine: clean(body.customer?.addressLine, 200),
    city: clean(body.customer?.city, 100),
    county: clean(body.customer?.county, 100),
    postalCode: clean(body.customer?.postalCode, 12),
  };
  const notes = clean(body.customer?.notes, 500) || null;

  let company: { name: string; cui: string } | null = null;
  if (body.customer?.isCompany === true) {
    company = {
      name: clean(body.customer?.companyName, 150),
      cui: clean(body.customer?.companyCui, 20).replace(/\s/g, "").toUpperCase(),
    };
    if (!company.name || !CUI_PATTERN.test(company.cui)) {
      return NextResponse.json({ error: "invalid_company" }, { status: 400 });
    }
  }

  if (
    !customer.firstName ||
    !customer.lastName ||
    !customer.phone ||
    !customer.addressLine ||
    !customer.city ||
    !customer.county ||
    !customer.postalCode ||
    !EMAIL_PATTERN.test(customer.email) ||
    body.termsAccepted !== true
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const rawItems: unknown = body.items;
  if (
    !Array.isArray(rawItems) ||
    rawItems.length === 0 ||
    rawItems.length > MAX_DISTINCT_ITEMS
  ) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  type RequestedLine = {
    productId: string;
    variantId: string | null;
    colorChoices: ColorChoiceInput[];
    colorNote: string | null;
    quantity: number;
  };

  const requested = new Map<string, RequestedLine>();
  const quantities = new Map<string, number>();
  for (const item of rawItems) {
    const productId = clean(item?.productId, 60);
    const variantId = clean(item?.variantId, 60) || null;
    const quantity = Number(item?.quantity);
    const colorChoices = parseColorChoices(item?.colorChoices);
    const colorNote = clean(item?.colorNote, MAX_COLOR_NOTE_LENGTH) || null;
    if (
      !productId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_ITEM ||
      colorChoices === null
    ) {
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    }

    const key = [
      productId,
      variantId ?? "",
      JSON.stringify(colorChoices),
      colorNote ?? "",
    ].join("|");
    const existing = requested.get(key);
    if (existing) existing.quantity += quantity;
    else requested.set(key, { productId, variantId, colorChoices: colorChoices!, colorNote, quantity });
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...quantities.keys()] }, isActive: true },
    include: {
      translations: true,
      inventory: true,
      category: true,
      variants: true,
      components: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (products.length !== quantities.size) {
    return NextResponse.json({ error: "unavailable" }, { status: 409 });
  }
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const product of products) {
    const available =
      (product.inventory?.quantityOnHand ?? 0) -
      (product.inventory?.reservedQty ?? 0);
    if (quantities.get(product.id)! > available) {
      return NextResponse.json(
        { error: "out_of_stock", productId: product.id },
        { status: 409 },
      );
    }
    if (product.currency !== "RON") {
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    }
  }

  const lines: {
    productId: string;
    name: string;
    code: string;
    category: string;
    variantName: string | null;
    colorChoices: { component: string | null; colors: string[] }[];
    colorNote: string | null;
    unitPriceCents: number;
    quantity: number;
  }[] = [];
  for (const line of requested.values()) {
    const product = productById.get(line.productId)!;

    const variant = line.variantId
      ? product.variants.find((v) => v.id === line.variantId)
      : null;
    // A product with variants needs one of them; one without must not get any.
    if (
      (product.variants.length > 0 && !variant) ||
      (product.variants.length === 0 && line.variantId)
    ) {
      return NextResponse.json({ error: "unavailable" }, { status: 409 });
    }
    // Made-to-order colours: every component needs 1..max colours.
    const expected = product.hasColorOptions
      ? product.components.length > 0
        ? product.components.map((c) => ({
            id: c.id,
            max: c.maxColors,
            name: locale === "en" ? (c.nameEn ?? c.nameRo) : c.nameRo,
          }))
        : [{ id: DEFAULT_COMPONENT_ID, max: MAX_COLORS, name: null }]
      : [];
    const orderChoices: { component: string | null; colors: string[] }[] = [];
    let colorsValid =
      line.colorChoices.length === expected.length &&
      (product.hasColorOptions || !line.colorNote);
    for (const component of expected) {
      const choice = line.colorChoices.find((c) => c.componentId === component.id);
      if (!choice || choice.colors.length < 1 || choice.colors.length > component.max) {
        colorsValid = false;
        break;
      }
      orderChoices.push({ component: component.name, colors: choice.colors });
    }
    if (!colorsValid) {
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    }

    const translation =
      product.translations.find((t) => t.locale === locale) ??
      product.translations.find((t) => t.locale === "ro");
    lines.push({
      productId: product.id,
      name: translation?.name ?? product.slug,
      code: product.slug,
      category: product.category.slug,
      variantName: variant
        ? locale === "en"
          ? (variant.nameEn ?? variant.nameRo)
          : variant.nameRo
        : null,
      colorChoices: orderChoices,
      colorNote: line.colorNote,
      unitPriceCents: variant?.priceCents ?? product.priceCents,
      quantity: line.quantity,
    });
  }

  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const isCod = body.paymentMethod === "cod";
  const shippingCents = calculateShippingCents(subtotalCents);
  const codFeeCents = isCod ? COD_FEE_CENTS : 0;
  const totalCents = subtotalCents + shippingCents + codFeeCents;

  const customerId = await getCurrentCustomerId().catch(() => null);

  const orderData = {
    customerEmail: customer.email,
    customerId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    addressLine: customer.addressLine,
    city: customer.city,
    county: customer.county,
    postalCode: customer.postalCode,
    notes,
    companyName: company?.name ?? null,
    companyCui: company?.cui ?? null,
    paymentMethod: isCod ? ("COD" as const) : ("CARD" as const),
    status: isCod ? ("COD" as const) : ("PENDING" as const),
    subtotalCents,
    shippingCents,
    codFeeCents,
    totalCents,
    currency: "RON",
    locale,
    termsAcceptedAt: new Date(),
    items: {
      create: lines.map((line) => ({
        productId: line.productId,
        productNameSnapshot: line.name,
        variantName: line.variantName,
        colors: line.colorChoices.flatMap((c) => c.colors),
        colorChoices: line.colorChoices,
        colorNote: line.colorNote,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
      })),
    },
  };

  if (isCod) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        for (const line of lines) {
          const result = await tx.inventory.updateMany({
            where: {
              productId: line.productId,
              quantityOnHand: { gte: line.quantity },
            },
            data: { quantityOnHand: { decrement: line.quantity } },
          });
          if (result.count === 0) throw new OutOfStockError(line.productId);
        }
        return tx.order.create({ data: orderData, include: { items: true } });
      });
      await sendOrderEmails(order);
      return NextResponse.json({
        redirectUrl: `/${locale}/checkout/return?order=${order.id}`,
      });
    } catch (err) {
      if (err instanceof OutOfStockError) {
        return NextResponse.json(
          { error: "out_of_stock", productId: err.productId },
          { status: 409 },
        );
      }
      throw err;
    }
  }

  const order = await prisma.order.create({ data: orderData });

  try {
    const paymentLines = lines.map((line) => ({
      name: line.variantName ? `${line.name} – ${line.variantName}` : line.name,
      code: line.code,
      category: line.category,
      priceCents: line.unitPriceCents * line.quantity,
    }));
    if (shippingCents > 0) {
      paymentLines.push({
        name: locale === "en" ? "Shipping" : "Livrare",
        code: "shipping",
        category: "shipping",
        priceCents: shippingCents,
      });
    }

    const { paymentUrl, ntpId } = await startNetopiaPayment({
      orderId: order.id,
      description: `iDesignStudio.ro #${order.id.slice(0, 8)}`,
      totalCents,
      currency: "RON",
      locale,
      siteUrl: siteUrl(),
      customer: { ...customer, phone: customer.phone },
      lines: paymentLines,
    });

    await prisma.order.update({ where: { id: order.id }, data: { ntpId } });
    return NextResponse.json({ paymentUrl, orderId: order.id });
  } catch (err) {
    console.error("Could not start Netopia payment", err);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
}
