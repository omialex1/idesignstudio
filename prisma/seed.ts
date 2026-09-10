import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type CategorySeed = {
  slug: string;
  sortOrder: number;
  ro: { name: string; description: string };
  en: { name: string; description: string };
  products: {
    slug: string;
    priceCents: number;
    quantityOnHand: number;
    ro: { name: string; description: string };
    en: { name: string; description: string };
  }[];
};

const eventsCategories: CategorySeed[] = [
  {
    slug: "wedding-decor",
    sortOrder: 1,
    ro: { name: "Decor Nunta", description: "Decor personalizat pentru nunti de neuitat." },
    en: { name: "Wedding Decor", description: "Custom decor for unforgettable weddings." },
    products: [
      {
        slug: "floral-arch",
        priceCents: 120000,
        quantityOnHand: 5,
        ro: { name: "Arcada Florala", description: "Arcada decorativa cu flori pentru ceremonie." },
        en: { name: "Floral Arch", description: "Decorative floral arch for the ceremony." },
      },
      {
        slug: "table-centerpiece",
        priceCents: 25000,
        quantityOnHand: 20,
        ro: { name: "Aranjament Masa", description: "Aranjament floral pentru masa invitatilor." },
        en: { name: "Table Centerpiece", description: "Floral centerpiece for guest tables." },
      },
    ],
  },
  {
    slug: "party-signage",
    sortOrder: 2,
    ro: { name: "Panouri Petrecere", description: "Panouri personalizate pentru evenimente festive." },
    en: { name: "Party Signage", description: "Custom signage for festive events." },
    products: [
      {
        slug: "welcome-sign",
        priceCents: 35000,
        quantityOnHand: 10,
        ro: { name: "Panou Bun Venit", description: "Panou personalizat de intampinare." },
        en: { name: "Welcome Sign", description: "Custom welcome sign for guests." },
      },
    ],
  },
  {
    slug: "corporate-events",
    sortOrder: 3,
    ro: { name: "Evenimente Corporate", description: "Decor si organizare pentru evenimente business." },
    en: { name: "Corporate Events", description: "Decor and planning for business events." },
    products: [
      {
        slug: "branded-backdrop",
        priceCents: 90000,
        quantityOnHand: 3,
        ro: { name: "Backdrop Personalizat", description: "Fundal personalizat cu branding-ul companiei." },
        en: { name: "Branded Backdrop", description: "Custom backdrop featuring your company branding." },
      },
    ],
  },
];

const stationaryCategories: CategorySeed[] = [
  {
    slug: "wedding-invitations",
    sortOrder: 1,
    ro: { name: "Invitatii Nunta", description: "Invitatii elegante pentru ziua voastra speciala." },
    en: { name: "Wedding Invitations", description: "Elegant invitations for your special day." },
    products: [
      {
        slug: "sealed-invitation",
        priceCents: 1500,
        quantityOnHand: 200,
        ro: { name: "Invitatie cu Sigiliu", description: "Invitatie eleganta cu sigiliu de ceara." },
        en: { name: "Wax-Seal Invitation", description: "Elegant invitation with a wax seal." },
      },
      {
        slug: "envelope-invitation",
        priceCents: 1200,
        quantityOnHand: 200,
        ro: { name: "Invitatie cu Plic", description: "Invitatie clasica cu plic asortat." },
        en: { name: "Envelope Invitation", description: "Classic invitation with a matching envelope." },
      },
    ],
  },
  {
    slug: "menus-place-cards",
    sortOrder: 2,
    ro: { name: "Meniuri si Place Cards", description: "Papetarie coordonata pentru masa festiva." },
    en: { name: "Menus & Place Cards", description: "Coordinated stationery for the reception table." },
    products: [
      {
        slug: "individual-menu",
        priceCents: 900,
        quantityOnHand: 150,
        ro: { name: "Meniu Individual", description: "Meniu personalizat pentru fiecare invitat." },
        en: { name: "Individual Menu", description: "Personalized menu for each guest." },
      },
    ],
  },
  {
    slug: "thematic-stationery",
    sortOrder: 3,
    ro: { name: "Papetarie Tematica", description: "Colectii inspirate din temele voastre preferate." },
    en: { name: "Thematic Stationery", description: "Collections inspired by your favorite themes." },
    products: [
      {
        slug: "travel-theme-set",
        priceCents: 1800,
        quantityOnHand: 100,
        ro: { name: "Set Tema Calatorii", description: "Papetarie cu tematica de calatorie." },
        en: { name: "Travel Theme Set", description: "Stationery set with a travel theme." },
      },
    ],
  },
];

async function seedCategories(line: "EVENTS" | "STATIONARY", categories: CategorySeed[]) {
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { sortOrder: cat.sortOrder, line },
      create: { slug: cat.slug, sortOrder: cat.sortOrder, line },
    });

    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: category.id, locale: "ro" } },
      update: cat.ro,
      create: { categoryId: category.id, locale: "ro", ...cat.ro },
    });
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: category.id, locale: "en" } },
      update: cat.en,
      create: { categoryId: category.id, locale: "en", ...cat.en },
    });

    for (const p of cat.products) {
      const product = await prisma.product.upsert({
        where: { slug: p.slug },
        update: { priceCents: p.priceCents, categoryId: category.id },
        create: { slug: p.slug, priceCents: p.priceCents, categoryId: category.id },
      });

      await prisma.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale: "ro" } },
        update: p.ro,
        create: { productId: product.id, locale: "ro", ...p.ro },
      });
      await prisma.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale: "en" } },
        update: p.en,
        create: { productId: product.id, locale: "en", ...p.en },
      });

      await prisma.inventory.upsert({
        where: { productId: product.id },
        update: { quantityOnHand: p.quantityOnHand },
        create: { productId: product.id, quantityOnHand: p.quantityOnHand },
      });
    }
  }
}

async function main() {
  await seedCategories("EVENTS", eventsCategories);
  await seedCategories("STATIONARY", stationaryCategories);
}

main()
  .then(async () => {
    console.log("Seed complete.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
