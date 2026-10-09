import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// The shop's main categories. Idempotent: only creates the ones that are
// missing, never touches existing ones (they are edited from the admin).
const MAIN_CATEGORIES = [
  {
    slug: "events",
    sortOrder: 1,
    color: "salamander",
    ro: {
      name: "Evenimente",
      headline: "Alege categoria potrivita pentru evenimentul tau.",
      description:
        "Descopera colectiile noastre de decor si organizare pentru evenimente memorabile.",
    },
    en: {
      name: "Events",
      headline: "Find the right category for your event.",
      description:
        "Explore our collections of decor and planning for memorable events.",
    },
  },
  {
    slug: "handmade",
    sortOrder: 2,
    color: "tangerine",
    ro: {
      name: "Handmade",
      headline: "Obiecte făcute manual, cu grijă pentru detalii.",
      description: "Descoperă colecțiile noastre de obiecte lucrate manual.",
    },
    en: {
      name: "Handmade",
      headline: "Handmade objects, made with care for detail.",
      description: "Explore our collections of handcrafted objects.",
    },
  },
  {
    slug: "stationary",
    sortOrder: 3,
    color: "cream",
    ro: {
      name: "Papetărie",
      headline: "Papetarie personalizata pentru fiecare ocazie.",
      description:
        "Descopera colectiile noastre de invitatii, meniuri si accesorii de hartie.",
    },
    en: {
      name: "Stationery",
      headline: "Custom stationery for every occasion.",
      description:
        "Explore our collections of invitations, menus, and paper goods.",
    },
  },
  {
    slug: "home-lifestyle",
    sortOrder: 4,
    color: "taupe",
    ro: {
      name: "Casă și stil de viață",
      headline: "Obiecte care fac casa mai primitoare.",
      description: "Descoperă colecțiile noastre pentru casă și stil de viață.",
    },
    en: {
      name: "Home & lifestyle",
      headline: "Objects that make a home more welcoming.",
      description: "Explore our collections for home and lifestyle.",
    },
  },
];

async function main() {
  for (const m of MAIN_CATEGORIES) {
    const existing = await prisma.mainCategory.findUnique({
      where: { slug: m.slug },
      select: { id: true },
    });
    if (existing) {
      console.log(`exists: ${m.slug}`);
      continue;
    }
    await prisma.mainCategory.create({
      data: {
        slug: m.slug,
        sortOrder: m.sortOrder,
        color: m.color,
        translations: {
          create: [
            { locale: "ro", ...m.ro },
            { locale: "en", ...m.en },
          ],
        },
      },
    });
    console.log(`created: ${m.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
