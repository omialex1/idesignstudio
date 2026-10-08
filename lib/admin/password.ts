import { prisma } from "@/lib/db/client";

export const ADMIN_MIN_PASSWORD_LENGTH = 12;

// A password set through the reset flow lives in the database; until one has
// been set, the hash from the environment variable is used.
export async function getAdminPasswordHash(): Promise<string | null> {
  const credential = await prisma.adminCredential.findUnique({
    where: { id: "admin" },
  });
  if (credential) return credential.passwordHash;

  const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64;
  if (!hashB64) return null;
  return Buffer.from(hashB64, "base64").toString("utf-8");
}

export function getAdminResetEmail(): string | null {
  return (
    process.env.ADMIN_RESET_EMAIL ??
    process.env.WITHDRAWAL_NOTIFY_EMAIL ??
    null
  );
}
