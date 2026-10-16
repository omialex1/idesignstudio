import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin/auth";
import TwoFactorSetup from "@/components/admin/TwoFactorSetup";

export default async function AdminTwoFactorSetupPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !admin.id) redirect("/admin/login");
  if (admin.twoFactorEnabled) redirect("/admin");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-cream-300 bg-white p-8 shadow-sm">
        <p className="font-display text-xl text-taupe-800">
          iDesignStudio<span className="text-salamander-500">.ro</span>
        </p>
        <h1 className="mt-1 text-sm text-taupe-600">
          Autentificare în doi pași pentru {admin.username}
        </h1>
        <p className="mt-3 text-sm text-taupe-600">
          Panoul de administrare cere, pe lângă parolă, un cod din telefon.
          Trebuie făcut o singură dată.
        </p>
        <div className="mt-5">
          <TwoFactorSetup username={admin.username} />
        </div>
      </div>
    </div>
  );
}
