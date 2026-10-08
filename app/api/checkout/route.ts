import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import { startNetopiaPayment } from "@/lib/netopia";
import { calculateShippingCents } from "@/lib/shipping";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_QUANTITY_PER_ITEM = 20;
const MAX_DISTINCT_ITEMS = 50;

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

  const quantities = new Map<string, number>();
  for (const item of rawItems) {
    const productId = clean(item?.productId, 60);
    const quantity = Number(item?.quantity);
    if (
      !productId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    }
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...quantities.keys()] }, isActive: true },
    include: { translations: true, inventory: true, category: true },
  });
  if (products.length !== quantities.size) {
    return NextResponse.json({ error: "unavailable" }, { status: 409 });
  }

  const lines = [];
  for (const product of products) {
    const quantity = quantities.get(product.id)!;
    const available =
      (product.inventory?.quantityOnHand ?? 0) -
      (product.inventory?.reservedQty ?? 0);
    if (quantity > available) {
      return NextResponse.json(
        { error: "out_of_stock", productId: product.id },
        { status: 409 },
      );
    }
    if (product.currency !== "RON") {
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
      unitPriceCents: product.priceCents,
      quantity,
    });
  }

  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const shippingCents = calculateShippingCents(subtotalCents);
  const totalCents = subtotalCents + shippingCents;

  const customerId = await getCurrentCustomerId().catch(() => null);

  const order = await prisma.order.create({
    data: {
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
      subtotalCents,
      shippingCents,
      totalCents,
      currency: "RON",
      locale,
      termsAcceptedAt: new Date(),
      items: {
        create: lines.map((line) => ({
          productId: line.productId,
          productNameSnapshot: line.name,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
        })),
      },
    },
  });

  try {
    const paymentLines = lines.map((line) => ({
      name: line.name,
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
    return NextResponse.json({ paymentUrl });
  } catch (err) {
    console.error("Could not start Netopia payment", err);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
}
