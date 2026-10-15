import crypto from "node:crypto";

// From NETOPIA's official API spec (https://secure.sandbox.netopia-payments.com/spec).
// Sandbox keys do not work on live and the other way round.
const BASE_URLS = {
  sandbox: "https://secure.sandbox.netopia-payments.com",
  live: "https://secure.mobilpay.ro/pay",
};

const PRODUCT_VAT_PERCENT = 0;
const ROMANIA_ISO_NUMERIC = 642;

const JWT_ALGORITHMS: Record<string, string> = {
  RS256: "RSA-SHA256",
  RS384: "RSA-SHA384",
  RS512: "RSA-SHA512",
};

export const NETOPIA_PAID_STATUSES = [3, 5];
export const NETOPIA_CANCELED_STATUSES = [4];
export const NETOPIA_FAILED_STATUSES = [11, 12, 13, 23];

function getConfig() {
  // trimmed: a space or line break pasted with the value must not break the payment
  const apiKey = process.env.NETOPIA_API_KEY?.trim();
  const posSignature = process.env.NETOPIA_POS_SIGNATURE?.trim();
  if (!apiKey || !posSignature) {
    throw new Error("NETOPIA_API_KEY or NETOPIA_POS_SIGNATURE is not set");
  }
  const baseUrl =
    process.env.NETOPIA_ENV?.trim() === "live"
      ? BASE_URLS.live
      : BASE_URLS.sandbox;
  return { apiKey, posSignature, baseUrl };
}

export type NetopiaOrderInput = {
  orderId: string;
  description: string;
  totalCents: number;
  currency: string;
  locale: string;
  siteUrl: string;
  customer: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    addressLine: string;
    city: string;
    county: string;
    postalCode: string;
  };
  lines: { name: string; code: string; category: string; priceCents: number }[];
};

export async function startNetopiaPayment(input: NetopiaOrderInput) {
  const { apiKey, posSignature, baseUrl } = getConfig();
  const { customer } = input;

  const address = {
    email: customer.email,
    phone: customer.phone,
    firstName: customer.firstName,
    lastName: customer.lastName,
    city: customer.city,
    country: ROMANIA_ISO_NUMERIC,
    countryName: "Romania",
    state: customer.county,
    postalCode: customer.postalCode,
    details: customer.addressLine,
  };

  const body = {
    config: {
      emailTemplate: "",
      emailSubject: "",
      notifyUrl: `${input.siteUrl}/api/netopia/ipn`,
      redirectUrl: `${input.siteUrl}/${input.locale}/checkout/return?order=${input.orderId}`,
      cancelUrl: `${input.siteUrl}/${input.locale}/cart`,
      language: input.locale,
    },
    payment: { options: { installments: 0, bonus: 0 } },
    order: {
      ntpID: "",
      posSignature,
      dateTime: new Date().toISOString(),
      description: input.description,
      orderID: input.orderId,
      amount: input.totalCents / 100,
      currency: input.currency,
      billing: address,
      shipping: address,
      products: input.lines.map((line) => ({
        name: line.name,
        code: line.code,
        category: line.category,
        price: line.priceCents / 100,
        vat: PRODUCT_VAT_PERCENT,
      })),
    },
  };

  const res = await fetch(`${baseUrl}/payment/card/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: {
    payment?: { paymentURL?: unknown; ntpID?: unknown };
    error?: unknown;
  } | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  const paymentUrl: unknown = data?.payment?.paymentURL;
  if (!res.ok || typeof paymentUrl !== "string") {
    const where = res.redirected
      ? `, redirected to ${new URL(res.url).host}`
      : "";
    const answer = data
      ? JSON.stringify(data.error ?? data)
      : `not JSON: ${raw.slice(0, 80).replace(/\s+/g, " ")}`;
    throw new Error(
      `Netopia payment start failed (${res.status}${where}): ${answer}`,
    );
  }

  return {
    paymentUrl,
    ntpId: data?.payment?.ntpID ? String(data.payment.ntpID) : null,
  };
}

// Asks NETOPIA what it knows about a payment (POST /operation/status). Returns
// null when the answer cannot be read, so callers simply keep the order as is.
export async function fetchNetopiaPaymentStatus(input: {
  orderId: string;
  ntpId: string;
}): Promise<{ status: number; amountCents: number | null } | null> {
  try {
    const { apiKey, posSignature, baseUrl } = getConfig();
    const res = await fetch(`${baseUrl}/operation/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        ntpID: input.ntpId,
        orderID: input.orderId,
        posID: posSignature,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => null);
    const status = data?.payment?.status;
    if (!res.ok || typeof status !== "number") return null;
    const amount = Number(data?.payment?.amount);
    return {
      status,
      amountCents: Number.isFinite(amount) ? Math.round(amount * 100) : null,
    };
  } catch (err) {
    console.error("Could not read the payment status from Netopia", err);
    return null;
  }
}

export type IpnVerification =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid"; detail: string };

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

// A key pasted into a settings field often loses its line breaks (one long
// line, spaces instead of breaks, or the two characters "\n"). Rebuild a clean
// PEM from the header, the base64 body and the footer, so the key still reads.
export function normalizePem(raw: string): string {
  const text = raw
    .replace(/\\n/g, "\n")
    .trim()
    .replace(/^["']|["']$/g, "");
  const found = text.match(
    /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/,
  );
  if (!found) return text;
  const body = found[2].replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN ${found[1]}-----\n${lines}\n-----END ${found[1]}-----\n`;
}

// Netopia signs each notification as a JWT: `sub` is the base64 SHA-512 of the
// exact request body and `aud` the POS signature it is meant for.
export function verifyNetopiaIpn(
  token: string | null,
  rawBody: string,
): IpnVerification {
  const configuredKey = process.env.NETOPIA_PUBLIC_KEY;
  const publicKeyPem = configuredKey ? normalizePem(configuredKey) : undefined;
  const posSignature = process.env.NETOPIA_POS_SIGNATURE;
  if (!publicKeyPem || !posSignature) {
    return { ok: false, reason: "not_configured", detail: "setari lipsa" };
  }
  if (!token) return { ok: false, reason: "invalid", detail: "fara jeton" };

  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) {
      return { ok: false, reason: "invalid", detail: "jeton prost format" };
    }

    const header = JSON.parse(decodeBase64Url(headerPart).toString("utf8"));
    const algorithm = JWT_ALGORITHMS[header.alg];
    if (!algorithm) {
      return {
        ok: false,
        reason: "invalid",
        detail: `algoritm ${String(header.alg).slice(0, 12)}`,
      };
    }

    const signatureValid = crypto.verify(
      algorithm,
      Buffer.from(`${headerPart}.${payloadPart}`),
      crypto.createPublicKey(publicKeyPem),
      decodeBase64Url(signaturePart),
    );
    if (!signatureValid) {
      return {
        ok: false,
        reason: "invalid",
        detail: "semnatura nu se potriveste cu cheia publica",
      };
    }

    const payload = JSON.parse(decodeBase64Url(payloadPart).toString("utf8"));
    if (payload.iss !== "NETOPIA Payments") {
      return { ok: false, reason: "invalid", detail: "emitent neasteptat" };
    }
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return { ok: false, reason: "invalid", detail: "jeton expirat" };
    }

    const audiences: unknown[] = Array.isArray(payload.aud)
      ? payload.aud
      : [payload.aud];
    if (!audiences.includes(posSignature)) {
      return {
        ok: false,
        reason: "invalid",
        detail: "destinatar (semnatura POS) diferit",
      };
    }

    const bodyHash = crypto
      .createHash("sha512")
      .update(rawBody)
      .digest("base64");
    if (bodyHash !== payload.sub) {
      return {
        ok: false,
        reason: "invalid",
        detail: "continutul nu se potriveste cu jetonul",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "invalid",
      detail: "cheia publica nu poate fi citita",
    };
  }
}
