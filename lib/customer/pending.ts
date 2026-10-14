import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// "Waiting for the e-mail to be confirmed". Set in the browser that created the
// account (or tried to log in to an unconfirmed one) after the password was
// proven. It lets that browser be logged in automatically once the address is
// confirmed, wherever the link is opened. It is not a login by itself.
const COOKIE_NAME = "customer_pending";
const TTL_SECONDS = 60 * 60 * 24; // same as the confirmation link

function getSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) throw new Error("CUSTOMER_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function setPendingVerification(customerId: string) {
  const token = await new SignJWT({
    customerId,
    purpose: "pending-verification",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function getPendingCustomerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      payload.purpose !== "pending-verification" ||
      typeof payload.customerId !== "string"
    ) {
      return null;
    }
    return payload.customerId;
  } catch {
    return null;
  }
}

export async function clearPendingVerification() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
