import crypto from "node:crypto";

const BASE_URLS = {
  sandbox: "https://secure.sandbox.netopia-payments.com",
  live: "https://secure.netopia-payments.com",
};

const PRODUCT_VAT_PERCENT = 19;
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
  const apiKey = process.env.NETOPIA_API_KEY;
  const posSignature = process.env.NETOPIA_POS_SIGNATURE;
  if (!apiKey || !posSignature) {
    throw new Error("NETOPIA_API_KEY or NETOPIA_POS_SIGNATURE is not set");
  }
  const baseUrl =
    process.env.NETOPIA_ENV === "live" ? BASE_URLS.live : BASE_URLS.sandbox;
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

  const data = await res.json().catch(() => null);
  const paymentUrl: unknown = data?.payment?.paymentURL;
  if (!res.ok || typeof paymentUrl !== "string") {
    throw new Error(
      `Netopia payment start failed (${res.status}): ${JSON.stringify(data?.error ?? data)}`,
    );
  }

  return {
    paymentUrl,
    ntpId: data.payment.ntpID ? String(data.payment.ntpID) : null,
  };
}

export type IpnVerification =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid" };

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

// Netopia signs each notification as a JWT: `sub` is the base64 SHA-512 of the
// exact request body and `aud` the POS signature it is meant for.
export function verifyNetopiaIpn(
  token: string | null,
  rawBody: string,
): IpnVerification {
  const publicKeyPem = process.env.NETOPIA_PUBLIC_KEY?.replace(/\\n/g, "\n");
  const posSignature = process.env.NETOPIA_POS_SIGNATURE;
  if (!publicKeyPem || !posSignature) {
    return { ok: false, reason: "not_configured" };
  }
  if (!token) return { ok: false, reason: "invalid" };

  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) {
      return { ok: false, reason: "invalid" };
    }

    const header = JSON.parse(decodeBase64Url(headerPart).toString("utf8"));
    const algorithm = JWT_ALGORITHMS[header.alg];
    if (!algorithm) return { ok: false, reason: "invalid" };

    const signatureValid = crypto.verify(
      algorithm,
      Buffer.from(`${headerPart}.${payloadPart}`),
      crypto.createPublicKey(publicKeyPem),
      decodeBase64Url(signaturePart),
    );
    if (!signatureValid) return { ok: false, reason: "invalid" };

    const payload = JSON.parse(decodeBase64Url(payloadPart).toString("utf8"));
    if (payload.iss !== "NETOPIA Payments") {
      return { ok: false, reason: "invalid" };
    }
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return { ok: false, reason: "invalid" };
    }

    const audiences: unknown[] = Array.isArray(payload.aud)
      ? payload.aud
      : [payload.aud];
    if (!audiences.includes(posSignature)) {
      return { ok: false, reason: "invalid" };
    }

    const bodyHash = crypto
      .createHash("sha512")
      .update(rawBody)
      .digest("base64");
    if (bodyHash !== payload.sub) return { ok: false, reason: "invalid" };

    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
