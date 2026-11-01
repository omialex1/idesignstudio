import { notFound } from "next/navigation";
import GroupEditor from "@/components/admin/groups/GroupEditor";
import { listGroupTypes } from "@/lib/admin/group-types";
import { getGroup } from "@/lib/admin/groups";

export default async function EditGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvat?: string }>;
}) {
  const { id } = await params;
  const { salvat } = await searchParams;
  const [types, group] = await Promise.all([listGroupTypes(), getGroup(id)]);
  if (!group) notFound();

  return (
    <GroupEditor
      // a fresh editor for every group (and after every save)
      key={`${group.id}-${salvat ?? ""}`}
      types={types}
      group={group}
      justSaved={salvat === "1"}
    />
  );
}
