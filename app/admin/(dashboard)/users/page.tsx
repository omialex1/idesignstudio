import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/format-date";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";

export default async function AdminUsersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const users = await prisma.adminUser.findMany({
    orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Conturi admin</h1>
      <AdminUsersPanel
        currentId={admin.id}
        canManage={admin.isOwner}
        users={users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          isOwner: u.isOwner,
          isActive: u.isActive,
          hasPassword: Boolean(u.passwordHash),
          lastLogin: u.lastLoginAt ? formatDateTime(u.lastLoginAt, "ro") : null,
        }))}
      />
    </div>
  );
}
