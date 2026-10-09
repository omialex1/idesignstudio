import { lineConfig } from "@/lib/lines";
import type { ProductLine } from "@/lib/generated/prisma";

type CategoryOption = { id: string; name: string; line: ProductLine };

export type ComponentDefaults = {
  nameRo: string;
  nameEn: string;
  maxColors: number;
};

export const COMPONENT_SLOTS = 5;

export type VariantDefaults = { nameRo: string; nameEn: string; priceRon: string };

export const VARIANT_SLOTS = 4;

export type ProductFormDefaults = {
  categoryId: string;
  slug: string;
  roName: string;
  roDescription: string;
  roLongDescription: string;
  enName: string;
  enDescription: string;
  enLongDescription: string;
  priceRon: string;
  hasColorOptions: boolean;
  variants: VariantDefaults[];
  components: ComponentDefaults[];
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
    roLongDescription: "",
    enName: "",
    enDescription: "",
    enLongDescription: "",
    priceRon: "",
    hasColorOptions: true,
    variants: [],
    components: [],
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
                {c.name} ({lineConfig(c.line).adminLabel})
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

        <Field
          label="Descriere scurtă (Română)"
          hint="Apare pe card și în Google."
        >
          <textarea
            name="roDescription"
            defaultValue={d.roDescription}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field
          label="Descriere detaliată (Română)"
          hint="Apare pe pagina produsului. Rândurile noi se păstrează."
        >
          <textarea
            name="roLongDescription"
            defaultValue={d.roLongDescription}
            rows={10}
            className={inputClass}
          />
        </Field>

        <Field label="Nume (Engleză)" hint="Opțional — dacă lipsește, se afișează numele în română.">
          <input name="enName" defaultValue={d.enName} className={inputClass} />
        </Field>

        <Field label="Descriere scurtă (Engleză)">
          <textarea
            name="enDescription"
            defaultValue={d.enDescription}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="Descriere detaliată (Engleză)">
          <textarea
            name="enLongDescription"
            defaultValue={d.enLongDescription}
            rows={10}
            className={inputClass}
          />
        </Field>

        <Field
          label="Preț (RON)"
          hint="Lasă gol dacă produsul are variante cu preț propriu (mai jos)."
        >
          <input
            name="priceRon"
            type="number"
            step="0.01"
            min="0"
            defaultValue={d.priceRon}
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-taupe-700">
          <input
            type="checkbox"
            name="hasColorOptions"
            defaultChecked={d.hasColorOptions}
            className="h-4 w-4 rounded border-cream-200"
          />
          Clientul alege culorile (produs făcut la comandă)
        </label>

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
        <div>
          <h2 className="font-display text-lg text-taupe-800">
            Componente și culori
          </h2>
          <p className="mt-1 text-xs text-taupe-400">
            Pentru produsele la care clientul alege culorile (bifa de mai sus).
            Adaugă fiecare componentă (ex: Cutie, Grilă, Capac) și spune câte
            culori poate alege clientul pentru ea. Dacă nu adaugi nimic,
            clientul alege până la 3 culori pentru întregul produs.
          </p>
        </div>
        {Array.from({ length: COMPONENT_SLOTS }, (_, i) => {
          const c = d.components[i];
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_8rem] gap-3">
              <input
                name={`componentNameRo${i}`}
                defaultValue={c?.nameRo ?? ""}
                placeholder={`Componenta ${i + 1} (Română)`}
                className={inputClass}
              />
              <input
                name={`componentNameEn${i}`}
                defaultValue={c?.nameEn ?? ""}
                placeholder="(Engleză)"
                className={inputClass}
              />
              <select
                name={`componentMaxColors${i}`}
                defaultValue={c?.maxColors ?? 1}
                className={selectClass}
                aria-label="Număr maxim de culori"
              >
                <option value={1}>1 culoare</option>
                <option value={2}>până la 2</option>
                <option value={3}>până la 3</option>
              </select>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
        <div>
          <h2 className="font-display text-lg text-taupe-800">Variante</h2>
          <p className="mt-1 text-xs text-taupe-400">
            Opțional. Ex: Mare / Mic / Set, fiecare cu prețul lui. Un rând gol
            nu se folosește. Dacă ai variante, prețul de mai sus se ignoră.
          </p>
        </div>
        {Array.from({ length: VARIANT_SLOTS }, (_, i) => {
          const v = d.variants[i];
          return (
            <div key={i} className="grid grid-cols-3 gap-3">
              <input
                name={`variantNameRo${i}`}
                defaultValue={v?.nameRo ?? ""}
                placeholder={`Variantă ${i + 1} (Română)`}
                className={inputClass}
              />
              <input
                name={`variantNameEn${i}`}
                defaultValue={v?.nameEn ?? ""}
                placeholder="(Engleză)"
                className={inputClass}
              />
              <input
                name={`variantPriceRon${i}`}
                type="number"
                step="0.01"
                min="0"
                defaultValue={v?.priceRon ?? ""}
                placeholder="Preț RON"
                className={inputClass}
              />
            </div>
          );
        })}
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
        className="w-fit rounded-full bg-salamander-500 px-8 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
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
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";
const selectClass = inputClass + " bg-white";
