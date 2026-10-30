import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { logAdminAction } from "@/lib/admin/log";
import { groupsAdmin } from "@/lib/admin/groups";
import { cleanTypeName, listGroupTypes } from "@/lib/admin/group-types";

export async function GET() {
  if (!(await groupsAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ types: await listGroupTypes() });
}

// Adds a kind of group.
export async function POST(request: Request) {
  const admin = await groupsAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = cleanTypeName(body?.name);
  if (!name) return NextResponse.json({ error: "name" }, { status: 400 });

  const last = await prisma.productGroupType.aggregate({ _max: { sortOrder: true } });
  const type = await prisma.productGroupType.create({
    data: {
      name,
      showOnSite: body?.showOnSite === true,
      hasDiscount: body?.hasDiscount === true,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
  });
  await logAdminAction(admin, "Tip de grup creat", name);
  return NextResponse.json({ id: type.id });
}
