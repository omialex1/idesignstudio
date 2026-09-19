import type { ProductLine } from "@/lib/generated/prisma";

type CategoryOption = { id: string; name: string; line: ProductLine };

export type ProductFormDefaults = {
  categoryId: string;
  slug: string;
  roName: string;
  roDescription: string;
  enName: string;
  enDescription: string;
  priceRon: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export default function ProductForm({
  action,
  categories,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: CategoryOption[];
  defaultValues?: ProductFormDefaults;
  submitLabel: string;
}) {
  const d: ProductFormDefaults = defaultValues ?? {
    categoryId: categories[0]?.id ?? "",
    slug: "",
    roName: "",
    roDescription: "",
    enName: "",
    enDescription: "",
    priceRon: "",
    quantityOnHand: 0,
    lowStockThreshold: 5,
    isActive: true,
  };

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
        <h2 className="font-display text-lg text-taupe-800">General</h2>

        <Field label="Categorie">
          <select
            name="categoryId"
            defaultValue={d.categoryId}
            required
            className={selectClass}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.line === "EVENTS" ? "Evenimente" : "Papetărie"})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Slug (URL)" hint="Lasă gol pentru generare automată din nume.">
          <input name="slug" defaultValue={d.slug} className={inputClass} />
        </Field>

        <Field label="Nume (Română)">
          <input
            name="roName"
            defaultValue={d.roName}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Descriere (Română)">
          <textarea
            name="roDescription"
            defaultValue={d.roDescription}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="Nume (Engleză)" hint="Opțional — dacă lipsește, se afișează numele în română.">
          <input name="enName" defaultValue={d.enName} className={inputClass} />
        </Field>

        <Field label="Descriere (Engleză)">
          <textarea
            name="enDescription"
            defaultValue={d.enDescription}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="Preț (RON)">
          <input
            name="priceRon"
            type="number"
            step="0.01"
            min="0"
            defaultValue={d.priceRon}
            required
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-taupe-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={d.isActive}
            className="h-4 w-4 rounded border-cream-200"
          />
          Vizibil pe site
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
        <h2 className="font-display text-lg text-taupe-800">Inventar</h2>

        <Field label="Cantitate în stoc">
          <input
            name="quantityOnHand"
            type="number"
            min="0"
            defaultValue={d.quantityOnHand}
            required
            className={inputClass}
          />
        </Field>

        <Field
          label="Prag stoc redus"
          hint="Sub această cantitate, produsul apare ca „stoc redus”."
        >
          <input
            name="lowStockThreshold"
            type="number"
            min="0"
            defaultValue={d.lowStockThreshold}
            required
            className={inputClass}
          />
        </Field>
      </section>

      <button
        type="submit"
        className="w-fit rounded-full bg-terracotta-500 px-8 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-terracotta-600"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-taupe-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-taupe-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-terracotta-400";
const selectClass = inputClass + " bg-white";
