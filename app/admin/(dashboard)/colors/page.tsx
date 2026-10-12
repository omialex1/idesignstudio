import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { swatchStyle } from "@/lib/colors-shared";

export default async function AdminColorsPage() {
  const mains = await prisma.mainCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      translations: true,
      colors: { select: { id: true, hex: true, isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Culori</h1>
      <p className="-mt-3 max-w-2xl text-sm text-taupe-500">
        Fiecare categorie are propria listă de culori, pe care o editezi aici.
        Doar categoriile cu culori activate (acum, produsele 3D de la „Casă și
        stil de viață”) arată paleta în magazin și opțiunea de culoare în
        formularul de produs.
      </p>

      <div className="flex flex-col gap-3">
        {mains.map((m) => {
          const name = m.translations.find((t) => t.locale === "ro")?.name ?? m.slug;
          const active = m.colors.filter((c) => c.isActive);
          return (
            <Link
              key={m.id}
              href={`/admin/colors/${m.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cream-300 bg-white shadow-sm p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <p className="font-medium text-taupe-800">{name}</p>
                <p className="text-xs text-taupe-500">
                  {m.usesColors
                    ? `${active.length} ${active.length === 1 ? "culoare activă" : "culori active"}`
                    : "Fără culori (produsele nu se fac în culoarea aleasă de client)"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {m.usesColors && (
                  <span className="flex -space-x-1.5">
                    {active.slice(0, 8).map((c) => (
                      <span
                        key={c.id}
                        className="h-6 w-6 rounded-full ring-2 ring-white"
                        style={swatchStyle(c.hex)}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                )}
                <span className="text-sm font-medium text-salamander-600">
                  Editează culorile
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
