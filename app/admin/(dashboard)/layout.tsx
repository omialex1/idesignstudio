import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import GroupsWindow from "@/components/admin/GroupsWindow";
import { getCurrentAdmin } from "@/lib/admin/auth";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy only checks the cookie's signature; here the account itself is
  // checked (still active, password not changed since).
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  // two-step login is required: until it is set up, only the set-up page opens
  if (!admin.twoFactorEnabled) redirect("/admin/2fa-setup");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar username={admin.username} />
      <main className="flex-1 bg-[#e6d9c2] p-8">{children}</main>
      <GroupsWindow />
    </div>
  );
}
