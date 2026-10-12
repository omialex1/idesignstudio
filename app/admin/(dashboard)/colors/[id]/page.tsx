import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import ColorEditor from "@/components/admin/ColorEditor";

export default async function AdminCategoryColorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const main = await prisma.mainCategory.findUnique({
    where: { id },
    include: {
      translations: true,
      colors: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!main) notFound();
  const name = main.translations.find((t) => t.locale === "ro")?.name ?? main.slug;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/colors" className="text-sm text-salamander-600 hover:underline">
          ← Toate categoriile
        </Link>
        <h1 className="mt-2 font-display text-2xl text-taupe-800">
          Culori · {name}
        </h1>
      </div>
      <ColorEditor
        mainId={main.id}
        mainName={name}
        usesColors={main.usesColors}
        colors={main.colors.map((c) => ({
          id: c.id,
          slug: c.slug,
          nameRo: c.nameRo,
          nameEn: c.nameEn,
          hex: c.hex,
          swatchImage: c.swatchImage,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
        }))}
      />
    </div>
  );
}
