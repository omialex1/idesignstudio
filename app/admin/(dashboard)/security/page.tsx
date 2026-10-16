import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/format-date";
import SecurityPanel from "@/components/admin/SecurityPanel";

export default async function AdminSecurityPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!admin.id) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl text-taupe-800">Securitate</h1>
        <p className="text-sm text-taupe-600">
          Ești conectat cu parola veche comună, fără cont personal.
        </p>
      </div>
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: admin.id },
    include: {
      backupCodes: { where: { usedAt: null }, select: { id: true } },
    },
  });
  if (!user) redirect("/admin/login");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Securitate</h1>

      <section className="rounded-2xl border border-cream-200 bg-white p-6">
        <h2 className="font-display text-lg text-taupe-800">
          Autentificare în doi pași
        </h2>
        <p className="mt-1 text-sm text-taupe-600">
          Activă
          {user.totpEnabledAt &&
            ` din ${formatDateTime(user.totpEnabledAt, "ro")}`}
          . La fiecare conectare, pe lângă parolă, ți se cere codul din
          aplicația de pe telefon.
        </p>
        <p className="mt-2 text-xs text-taupe-500">
          Dacă îți pierzi telefonul și nu ai coduri de rezervă, celălalt
          administrator îți poate reseta autentificarea din „Conturi admin”.
        </p>
      </section>

      <SecurityPanel
        username={user.username}
        remaining={user.backupCodes.length}
      />
    </div>
  );
}
