import { prisma } from "@/lib/db/client";
import type { AdminIdentity } from "@/lib/admin/auth";

// Writes one line in the activity log. A failure here must never stop the
// change itself, so it is only reported in the server log.
export async function logAdminAction(
  admin: Pick<AdminIdentity, "id" | "username">,
  action: string,
  detail?: string,
) {
  try {
    await prisma.adminLog.create({
      data: {
        adminUserId: admin.id,
        username: admin.username,
        action,
        detail: detail ? detail.slice(0, 500) : null,
      },
    });
  } catch (err) {
    console.error("Could not write the admin activity log", err);
  }
}
