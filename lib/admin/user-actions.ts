"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/admin/auth";
import { sendEmail } from "@/lib/email/client";
import { adminAccountChangedEmail } from "@/lib/email/templates/admin-account";
import { logAdminAction } from "@/lib/admin/log";
import {
  USERNAME_PATTERN,
  sendAdminInvite,
  sendAdminReset,
  officeEmail,
  usernameKey,
} from "@/lib/admin/users";

type Result = { message: string; error?: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only the owner may manage admin accounts.
async function requireOwner() {
  const admin = await requireAdmin();
  if (!admin.isOwner || !admin.id) throw new Error("unauthorized");
  return admin;
}

export async function inviteAdminAction(
  username: string,
  email: string,
): Promise<Result> {
  const owner = await requireOwner();
  const name = username.trim();
  const mail = email.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(name)) {
    return {
      error: true,
      message:
        "Numele de utilizator: 3-30 de caractere, doar litere, cifre, punct, minus sau liniuță jos.",
    };
  }
  if (!EMAIL_PATTERN.test(mail)) {
    return { error: true, message: "Adresa de e-mail nu este validă." };
  }
  const taken = await prisma.adminUser.findFirst({
    where: { OR: [{ usernameKey: usernameKey(name) }, { email: mail }] },
    select: { id: true },
  });
  if (taken) {
    return {
      error: true,
      message: "Există deja un cont cu acest nume sau această adresă.",
    };
  }

  const user = await prisma.adminUser.create({
    data: { username: name, usernameKey: usernameKey(name), email: mail },
  });
  await logAdminAction(owner, "Cont de admin creat", `${name} (${mail})`);
  try {
    await sendAdminInvite(user);
  } catch (err) {
    console.error("Could not send the admin invitation", err);
    revalidatePath("/admin/users");
    return {
      error: true,
      message:
        "Contul a fost creat, dar e-mailul de invitație nu s-a trimis. Apasă „Trimite din nou invitația”.",
    };
  }
  revalidatePath("/admin/users");
  return { message: `Invitația a fost trimisă la ${mail}.` };
}

export async function sendLinkAction(id: string): Promise<Result> {
  const owner = await requireOwner();
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) return { error: true, message: "Contul nu mai există." };
  if (!user.isActive) {
    return { error: true, message: "Contul este dezactivat." };
  }
  try {
    if (user.passwordHash) {
      await sendAdminReset(user);
      await logAdminAction(owner, "Link de resetare parolă trimis", user.username);
      return { message: `Link de resetare trimis la ${user.email} (valabil 1 oră).` };
    }
    await sendAdminInvite(user);
    await logAdminAction(owner, "Invitație retrimisă", user.username);
    return { message: `Invitația a fost trimisă din nou la ${user.email}.` };
  } catch (err) {
    console.error("Could not send the admin link", err);
    return { error: true, message: "E-mailul nu s-a putut trimite." };
  }
}

export async function setAdminActiveAction(
  id: string,
  active: boolean,
): Promise<Result> {
  const owner = await requireOwner();
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) return { error: true, message: "Contul nu mai există." };
  if (user.isOwner || user.id === owner.id) {
    return {
      error: true,
      message: "Contul proprietarului nu poate fi dezactivat.",
    };
  }
  await prisma.adminUser.update({
    where: { id },
    data: { isActive: active, sessionVersion: { increment: 1 } },
  });
  await logAdminAction(
    owner,
    active ? "Cont de admin reactivat" : "Cont de admin dezactivat",
    user.username,
  );
  revalidatePath("/admin/users");
  return { message: active ? "Contul a fost reactivat." : "Contul a fost dezactivat." };
}

export async function deleteAdminAction(id: string): Promise<Result> {
  const owner = await requireOwner();
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) return { error: true, message: "Contul nu mai există." };
  if (user.isOwner || user.id === owner.id) {
    return {
      error: true,
      message: "Contul proprietarului nu poate fi șters.",
    };
  }
  await prisma.adminUser.delete({ where: { id } });
  await logAdminAction(
    owner,
    "Cont de admin șters",
    `${user.username} (${user.email})`,
  );
  revalidatePath("/admin/users");
  return { message: "Contul a fost șters. Istoricul lui rămâne în jurnal." };
}

// Lost phone and no backup codes: the OTHER administrator clears the person's
// two-step login. They sign in with the password and set it up again. Both the
// person and the office mailbox are told by e-mail.
export async function resetTwoFactorAction(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin.id) throw new Error("unauthorized");
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) return { error: true, message: "Contul nu mai există." };
  if (user.id === admin.id) {
    return {
      error: true,
      message:
        "Nu îți poți reseta singur autentificarea. Cere celuilalt administrator.",
    };
  }
  if (!user.totpEnabledAt) {
    return {
      error: true,
      message: "Contul nu are autentificare în doi pași activată.",
    };
  }

  await prisma.$transaction([
    prisma.adminBackupCode.deleteMany({ where: { adminUserId: user.id } }),
    prisma.adminUser.update({
      where: { id: user.id },
      data: {
        totpSecret: null,
        totpEnabledAt: null,
        totpLastStep: null,
        sessionVersion: { increment: 1 },
      },
    }),
  ]);
  await logAdminAction(
    admin,
    "Autentificare în doi pași resetată",
    user.username,
  );

  const { subject, html } = adminAccountChangedEmail(
    user.username,
    `autentificarea în doi pași a fost resetată de ${admin.username}. La următoarea conectare trebuie configurată din nou`,
  );
  const recipients = [user.email, officeEmail()].filter(
    (to): to is string => Boolean(to),
  );
  await Promise.all(
    recipients.map((to) =>
      sendEmail({ to, subject, html }).catch((err) =>
        console.error("Could not send the 2FA reset notice", err),
      ),
    ),
  );
  revalidatePath("/admin/users");
  return {
    message: `Autentificarea lui ${user.username} a fost resetată. La următoarea conectare o configurează din nou.`,
  };
}
