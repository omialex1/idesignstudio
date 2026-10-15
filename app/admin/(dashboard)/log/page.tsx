import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/format-date";

const LIMIT = 300;

export default async function AdminLogPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const entries = await prisma.adminLog.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-taupe-800">Jurnal</h1>
        <p className="mt-1 text-sm text-taupe-500">
          Cine a făcut ce în panoul de administrare (ultimele {LIMIT}). Ora este
          cea din România.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-200 text-xs uppercase text-taupe-400">
            <tr>
              <th className="px-4 py-3 font-medium">Când</th>
              <th className="px-4 py-3 font-medium">Cine</th>
              <th className="px-4 py-3 font-medium">Ce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-taupe-500">
                  Încă nu e nimic în jurnal.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-taupe-500">
                  {formatDateTime(entry.createdAt, "ro")}
                </td>
                <td className="px-4 py-3 font-medium text-taupe-800">
                  {entry.username}
                </td>
                <td className="px-4 py-3 text-taupe-700">
                  {entry.action}
                  {entry.detail && (
                    <span className="block text-xs text-taupe-500">
                      {entry.detail}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
