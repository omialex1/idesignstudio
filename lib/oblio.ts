// Minimal Oblio (oblio.eu) API client: token + create invoice.
// Credentials come from OBLIO_EMAIL / OBLIO_SECRET (never hard-coded).

const BASE = "https://www.oblio.eu/api";

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
  const email = process.env.OBLIO_EMAIL;
  const secret = process.env.OBLIO_SECRET;
  if (!email || !secret) throw new Error("OBLIO_EMAIL / OBLIO_SECRET are not set");

  const res = await fetch(`${BASE}/authorize/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: email,
      client_secret: secret,
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    throw new Error(`Oblio auth failed (${res.status})`);
  }
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  return cached.token;
}

export type OblioProduct = {
  name: string;
  price: number;
  quantity: number;
  measuringUnit?: string;
  description?: string;
  code?: string;
  vatName?: string;
  vatPercentage?: number;
  vatIncluded?: 0 | 1;
  save?: 0 | 1;
};

export type OblioInvoiceRequest = {
  cif: string;
  seriesName: string;
  language?: string;
  currency?: string;
  idempotencyKey?: string;
  sendEmail?: 0 | 1;
  spvExtern?: 0 | 1;
  orderNumber?: string;
  mentions?: string;
  client: {
    name: string;
    cif?: string;
    address?: string;
    state?: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
    vatPayer?: 0 | 1;
    save?: 0 | 1;
  };
  products: OblioProduct[];
  collect?: { type: string; value?: number; documentNumber?: string };
};

export type OblioInvoice = { seriesName: string; number: string; link: string };

export async function createInvoice(
  body: OblioInvoiceRequest,
): Promise<OblioInvoice> {
  const token = await getToken();
  const res = await fetch(`${BASE}/docs/invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.status !== 200 || !data?.data?.number) {
    throw new Error(
      `Oblio invoice failed (${res.status}): ${data?.statusMessage ?? "no message"}`,
    );
  }
  return data.data as OblioInvoice;
}
