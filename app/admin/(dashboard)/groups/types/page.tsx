import Link from "next/link";
import AdminCard from "@/components/admin/AdminCard";
import TypeManager from "@/components/admin/groups/TypeManager";
import { listGroupTypes } from "@/lib/admin/group-types";

export default async function GroupTypesPage() {
  const types = await listGroupTypes();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/groups"
          className="text-sm font-medium text-salamander-600 hover:underline"
        >
          ← Toate grupurile
        </Link>
        <h1 className="mt-1 font-display text-2xl text-taupe-800">Tipuri de grup</h1>
      </div>
      <AdminCard title="Tipuri" bodyClassName="p-6">
        <TypeManager types={types} />
      </AdminCard>
    </div>
  );
}
