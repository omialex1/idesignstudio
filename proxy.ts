import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { jwtVerify } from "jose";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const ADMIN_COOKIE_NAME = "admin_session";
const CUSTOMER_COOKIE_NAME = "customer_session";
const PUBLIC_ACCOUNT_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

async function isValidSession(token: string | undefined, secretEnvVar: string) {
  if (!token) return false;
  const secret = process.env[secretEnvVar];
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const authenticated = await isValidSession(token, "ADMIN_SESSION_SECRET");
    if (!authenticated) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);

  const accountMatch = pathname.match(/^\/(ro|en)\/account(\/.*)?$/);
  if (accountMatch) {
    const locale = accountMatch[1];
    const subPath = accountMatch[2] || "";
    const isPublicAccountPath = PUBLIC_ACCOUNT_PATHS.some((p) =>
      subPath.startsWith(p),
    );

    if (!isPublicAccountPath) {
      const token = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
      const authenticated = await isValidSession(
        token,
        "CUSTOMER_SESSION_SECRET",
      );
      if (!authenticated) {
        return NextResponse.redirect(
          new URL(`/${locale}/account/login`, request.url),
        );
      }
    }
  }

  return intlResponse;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
