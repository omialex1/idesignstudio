"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/log";
import {
  USERNAME_PATTERN,
  sendAdminInvite,
  sendAdminReset,
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
