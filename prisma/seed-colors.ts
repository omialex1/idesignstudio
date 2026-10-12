import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";
import { COLORS } from "../lib/colors";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Starting colour set for the 3D-printed category (Casa si stil de viata):
// the 11 filament colours the shop already offered, with their texture photos.
// Idempotent: only creates what is missing and only switches the category on,
// so colours edited in the admin are never overwritten.
const HEX: Record<string, string> = {
  "bone-white": "#DFD8CD",
  "latte-brown": "#937A65",
  caramel: "#B58966",
  terracotta: "#A95A39",
  "dark-brown": "#5F4B44",
  "marble-concrete": "#DCD6C4",
  "dark-chocolate": "#403833",
  "dark-green": "#465233",
  "desert-tan": "#A69679",
  "dark-blue": "#22314D",
  "nardo-gray": "#636265",
};

async function main() {
  const main = await prisma.mainCategory.findUnique({
    where: { slug: "home-lifestyle" },
    select: { id: true },
  });
  if (!main) throw new Error("home-lifestyle category not found");

  await prisma.mainCategory.update({
    where: { id: main.id },
    data: { usesColors: true },
  });

  let order = 0;
  for (const c of COLORS) {
    order += 1;
    const existing = await prisma.color.findUnique({
      where: { slug: c.id },
      select: { id: true },
    });
    if (existing) {
      console.log(`exists: ${c.id}`);
      continue;
    }
    await prisma.color.create({
      data: {
        slug: c.id,
        mainCategoryId: main.id,
        nameRo: c.ro,
        nameEn: c.en,
        hex: HEX[c.id],
        swatchImage: true,
        sortOrder: order,
      },
    });
    console.log(`created: ${c.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
