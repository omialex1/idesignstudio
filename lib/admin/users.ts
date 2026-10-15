import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/client";
import {
  adminInviteEmail,
  adminNewDeviceEmail,
  adminResetEmail,
} from "@/lib/email/templates/admin-account";
import { generateResetToken } from "@/lib/customer/reset-token";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
export const DEVICE_COOKIE = "admin_device";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

// Business mailbox that also gets the security notices.
export function officeEmail(): string | null {
  return process.env.ADMIN_OFFICE_EMAIL ?? "office@idesignstudio.ro";
}

export function usernameKey(username: string) {
  return username.trim().toLowerCase();
}

export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;

// Makes a single-use link for the account; older unused links of the same kind
// stop working. Returns the link to put in the e-mail.
export async function createAdminLink(
  adminUserId: string,
  kind: "invite" | "reset",
  baseUrl = siteUrl(),
) {
  const { token, tokenHash } = generateResetToken();
  const ttl = kind === "invite" ? INVITE_TTL_MS : RESET_TTL_MS;
  await prisma.$transaction([
    prisma.adminUserToken.updateMany({
      where: { adminUserId, kind, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.adminUserToken.create({
      data: {
        adminUserId,
        kind,
        tokenHash,
        expiresAt: new Date(Date.now() + ttl),
      },
    }),
  ]);
  const path = kind === "invite" ? "invite" : "reset-password";
  return `${baseUrl}/admin/${path}?token=${token}`;
}

export async function sendAdminInvite(
  user: { id: string; username: string; email: string },
  baseUrl = siteUrl(),
) {
  const url = await createAdminLink(user.id, "invite", baseUrl);
  const { subject, html } = adminInviteEmail(user.username, url);
  await sendEmail({ to: user.email, subject, html });
}

export async function sendAdminReset(user: {
  id: string;
  username: string;
  email: string;
}) {
  const url = await createAdminLink(user.id, "reset");
  const { subject, html } = adminResetEmail(user.username, url);
  await sendEmail({ to: user.email, subject, html });
}

function deviceHashOf(deviceId: string) {
  return createHash("sha256")
    .update(`${process.env.ADMIN_SESSION_SECRET ?? ""}|device|${deviceId}`)
    .digest("hex");
}

export function newDeviceId() {
  return randomBytes(24).toString("hex");
}

const romanianTime = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function describeBrowser(userAgent: string | null) {
  if (!userAgent) return "necunoscut";
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /iPhone|iPad/i.test(userAgent)
      ? "iPhone/iPad"
      : /Android/i.test(userAgent)
        ? "Android"
        : /Mac OS/i.test(userAgent)
          ? "Mac"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "alt sistem";
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /OPR\//i.test(userAgent)
      ? "Opera"
      : /Firefox/i.test(userAgent)
        ? "Firefox"
        : /Chrome/i.test(userAgent)
          ? "Chrome"
          : /Safari/i.test(userAgent)
            ? "Safari"
            : "alt browser";
  return `${browser} pe ${os}`;
}

// Remembers the browser a person logs in from. A login from a browser not seen
// before (for someone who has logged in before) sends a warning to the person's
// own e-mail and to the office mailbox. Never throws: the login must not fail
// because of a mail problem. Returns the device id to keep in the cookie.
export async function registerLoginDevice(
  user: { id: string; username: string; email: string; lastLoginAt: Date | null },
  existingDeviceId: string | undefined,
  userAgent: string | null,
  ip: string,
): Promise<string> {
  const deviceId = existingDeviceId || newDeviceId();
  try {
    const deviceHash = deviceHashOf(deviceId);
    const known = await prisma.adminDevice.findUnique({
      where: { adminUserId_deviceHash: { adminUserId: user.id, deviceHash } },
    });
    if (known) {
      await prisma.adminDevice.update({
        where: { id: known.id },
        data: { lastSeenAt: new Date() },
      });
      return deviceId;
    }

    await prisma.adminDevice.create({
      data: {
        adminUserId: user.id,
        deviceHash,
        userAgent: userAgent?.slice(0, 300) ?? null,
      },
    });

    if (user.lastLoginAt) {
      const { subject, html } = adminNewDeviceEmail(
        user.username,
        romanianTime.format(new Date()),
        describeBrowser(userAgent),
        ip,
      );
      const recipients = [user.email, officeEmail()].filter(
        (to): to is string => Boolean(to),
      );
      await Promise.all(
        recipients.map((to) =>
          sendEmail({ to, subject, html }).catch((err) =>
            console.error("Could not send the new-device alert", err),
          ),
        ),
      );
    }
  } catch (err) {
    console.error("Could not register the login device", err);
  }
  return deviceId;
}
