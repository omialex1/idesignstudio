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

// The activity log is kept for 12 months (as the Privacy page says); older lines
// are deleted. Called once a day. Never throws: a failed clean-up only means the
// old lines are removed the next day.
export const ADMIN_LOG_KEEP_DAYS = 365;

export async function purgeOldAdminLogs(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - ADMIN_LOG_KEEP_DAYS * 24 * 60 * 60 * 1000);
    const result = await prisma.adminLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  } catch (err) {
    console.error("Could not clean up the admin activity log", err);
    return 0;
  }
}
