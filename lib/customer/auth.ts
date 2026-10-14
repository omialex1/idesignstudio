import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";

const COOKIE_NAME = "customer_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) {
    throw new Error("CUSTOMER_SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

// The login carries the customer's "session version". Changing or resetting the
// password raises the version in the database, which ends every older login.
export async function createCustomerSession(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { sessionVersion: true },
  });
  const token = await new SignJWT({
    customerId,
    v: customer?.sessionVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroyCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Signature and expiry only (no database); also used where a quick check is enough.
export async function verifyCustomerSessionToken(
  token: string | undefined,
): Promise<{ customerId: string; version: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.customerId !== "string") return null;
    // logins created before session versions existed count as version 0
    const version = typeof payload.v === "number" ? payload.v : 0;
    return { customerId: payload.customerId, version };
  } catch {
    return null;
  }
}

// The logged-in customer's id, or null. Checks the session version against the
// database, so a login from before a password change no longer works.
export async function getCurrentCustomerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = await verifyCustomerSessionToken(
    cookieStore.get(COOKIE_NAME)?.value,
  );
  if (!session) return null;

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: { sessionVersion: true },
  });
  if (!customer || customer.sessionVersion !== session.version) return null;
  return session.customerId;
}

export { COOKIE_NAME };
