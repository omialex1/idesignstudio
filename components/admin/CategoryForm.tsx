export type CategoryFormDefaults = {
  line: "EVENTS" | "STATIONARY";
  slug: string;
  roName: string;
  roDescription: string;
  enName: string;
  enDescription: string;
  sortOrder: number;
};

export default function CategoryForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: CategoryFormDefaults;
  submitLabel: string;
}) {
  const d: CategoryFormDefaults = defaultValues ?? {
    line: "EVENTS",
    slug: "",
    roName: "",
    roDescription: "",
    enName: "",
    enDescription: "",
    sortOrder: 0,
  };

  return (
    <form
      action={action}
      className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6"
    >
      <Field label="Linie">
        <select name="line" defaultValue={d.line} required className={selectClass}>
          <option value="EVENTS">Evenimente</option>
          <option value="STATIONARY">Papetărie</option>
        </select>
      </Field>

      <Field label="Slug (URL)" hint="Lasă gol pentru generare automată din nume.">
        <input name="slug" defaultValue={d.slug} className={inputClass} />
      </Field>

      <Field label="Nume (Română)">
        <input name="roName" defaultValue={d.roName} required className={inputClass} />
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

      <Field label="Ordine afișare" hint="Categoriile cu numere mai mici apar primele.">
        <input
          name="sortOrder"
          type="number"
          defaultValue={d.sortOrder}
          className={inputClass}
        />
      </Field>

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
