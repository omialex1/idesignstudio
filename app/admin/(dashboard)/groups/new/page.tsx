import GroupEditor from "@/components/admin/groups/GroupEditor";
import { listGroupTypes } from "@/lib/admin/group-types";
import { productsByIds } from "@/lib/admin/groups";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ tip?: string; produs?: string }>;
}) {
  const { tip, produs } = await searchParams;
  const types = await listGroupTypes();
  const chosen =
    types.find((t) => t.id === tip) ??
    types.find((t) => t.showOnSite) ??
    types[0];
  const withProduct = produs ? ((await productsByIds([produs]))[0] ?? null) : null;

  return (
    <GroupEditor
      types={types}
      group={null}
      newTypeId={chosen?.id}
      withProduct={withProduct}
    />
  );
}
