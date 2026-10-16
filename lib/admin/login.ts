import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { createAdminSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import { DEVICE_COOKIE, registerLoginDevice } from "@/lib/admin/users";

const DEVICE_COOKIE_SECONDS = 60 * 60 * 24 * 400;

type LoginUser = {
  id: string;
  username: string;
  email: string;
  lastLoginAt: Date | null;
  sessionVersion: number;
};

// The last step of every login (and of choosing a first password): remember the
// browser (and warn about a new one), note the time, start the session.
export async function finishAdminLogin(
  user: LoginUser,
  remember: boolean,
  request: Request,
  ip: string,
  logLabel = "Conectare",
) {
  const cookieStore = await cookies();
  const deviceId = await registerLoginDevice(
    user,
    cookieStore.get(DEVICE_COOKIE)?.value,
    request.headers.get("user-agent"),
    ip,
  );
  cookieStore.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_SECONDS,
  });

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createAdminSession(user, remember);
  await logAdminAction(user, logLabel);
}
