import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db/client";

const COOKIE_NAME = "admin_session";
const SHORT_SESSION_SECONDS = 60 * 60 * 8; // 8 hours
const REMEMBER_SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

// Who is using the admin panel. `id` is null only for the old shared password,
// which works just until the first account has chosen its own password.
export type AdminIdentity = {
  id: string | null;
  username: string;
  email: string | null;
  isOwner: boolean;
  // false until the person has set up the authenticator app; until then only
  // the set-up page is usable
  twoFactorEnabled: boolean;
};

export const LEGACY_ADMIN: AdminIdentity = {
  id: null,
  username: "Admin (parola veche)",
  email: null,
  isOwner: false,
  twoFactorEnabled: true,
};

type SessionUser = { id: string; sessionVersion: number } | null;

// `user` is null for the old shared-password login.
export async function createAdminSession(
  user: SessionUser,
  remember = false,
) {
  const seconds = remember ? REMEMBER_SESSION_SECONDS : SHORT_SESSION_SECONDS;
  const token = await new SignJWT({
    role: "admin",
    ...(user ? { uid: user.id, v: user.sessionVersion } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: seconds,
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Signature check only (used by the proxy, which cannot reach the database).
export async function verifyAdminSessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

// True while nobody has an account with a password yet.
export async function legacyLoginAllowed(): Promise<boolean> {
  const withPassword = await prisma.adminUser.count({
    where: { passwordHash: { not: null } },
  });
  return withPassword === 0;
}

// The signed-in person, checked against the database every time: a deactivated
// or deleted account, or a password changed since, stops working at once.
export const getCurrentAdmin = cache(
  async (): Promise<AdminIdentity | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    let payload;
    try {
      ({ payload } = await jwtVerify(token, getSecret()));
    } catch {
      return null;
    }

    // the short "password done, code still to give" cookie is signed with the
    // same key, so it must never count as a login
    if (payload.role !== "admin") return null;

    const uid = typeof payload.uid === "string" ? payload.uid : null;
    if (!uid) {
      return (await legacyLoginAllowed()) ? LEGACY_ADMIN : null;
    }

    const user = await prisma.adminUser.findUnique({ where: { id: uid } });
    if (
      !user ||
      !user.isActive ||
      !user.passwordHash ||
      user.sessionVersion !== payload.v
    ) {
      return null;
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isOwner: user.isOwner,
      twoFactorEnabled: user.totpEnabledAt !== null,
    };
  },
);

// Fully signed in: logged in AND two-step login set up.
export async function isAdminAuthenticated(): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return admin !== null && admin.twoFactorEnabled;
}

// For server actions: the signed-in admin, or an error.
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.twoFactorEnabled) throw new Error("unauthorized");
  return admin;
}

// ---- the step between the password and the code ----

const PENDING_COOKIE = "admin_2fa_pending";
const PENDING_SECONDS = 60 * 5;

export async function createPending2fa(
  user: { id: string; sessionVersion: number },
  remember: boolean,
) {
  const token = await new SignJWT({
    kind: "2fa",
    uid: user.id,
    v: user.sessionVersion,
    remember,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_SECONDS}s`)
    .sign(getSecret());
  const cookieStore = await cookies();
  cookieStore.set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_SECONDS,
  });
}

export async function readPending2fa(): Promise<{
  uid: string;
  v: number;
  remember: boolean;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== "2fa" || typeof payload.uid !== "string") return null;
    return {
      uid: payload.uid,
      v: Number(payload.v),
      remember: payload.remember === true,
    };
  } catch {
    return null;
  }
}

export async function clearPending2fa() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_COOKIE);
}

export { COOKIE_NAME };
