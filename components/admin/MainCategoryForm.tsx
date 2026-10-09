"use client";

import { useState } from "react";
import {
  hasErrors,
  validateMainCategoryForm,
  type FormErrors,
} from "@/lib/admin/form-validation";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import SubmitButton from "@/components/admin/SubmitButton";
import { Field, TranslateBar, controlClass } from "@/components/admin/FormBits";

export type MainCategoryFormDefaults = {
  slug: string;
  roName: string;
  enName: string;
  roHeadline: string;
  enHeadline: string;
  roDescription: string;
  enDescription: string;
  color: string;
  sortOrder: number;
};

const TRANSLATE_PAIRS: [string, string][] = [
  ["roName", "enName"],
  ["roHeadline", "enHeadline"],
  ["roDescription", "enDescription"],
];

export default function MainCategoryForm({
  onSubmit,
  defaultValues,
  submitLabel,
  // On edit the address is fixed, so existing links keep working.
  slugLocked = false,
}: {
  onSubmit: (formData: FormData) => Promise<unknown>;
  defaultValues?: MainCategoryFormDefaults;
  submitLabel: string;
  slugLocked?: boolean;
}) {
  const d: MainCategoryFormDefaults = defaultValues ?? {
    slug: "",
    roName: "",
    enName: "",
    roHeadline: "",
    enHeadline: "",
    roDescription: "",
    enDescription: "",
    color: CATEGORY_COLORS[0].key,
    sortOrder: 0,
  };

  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [color, setColor] = useState(d.color);

  function showErrors(next: FormErrors, form: HTMLFormElement) {
    setErrors(next);
    requestAnimationFrame(() => {
      const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      first?.focus({ preventScroll: true });
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const clientErrors = validateMainCategoryForm(formData);
    if (hasErrors(clientErrors)) {
      showErrors(clientErrors, form);
      return;
    }

    setErrors({});
    setPending(true);
    try {
      const result = (await onSubmit(formData)) as
        | { errors?: FormErrors }
        | undefined;
      if (result?.errors && hasErrors(result.errors)) {
        showErrors(result.errors, form);
      }
    } catch {
      showErrors({ _form: "Nu am putut salva categoria. Încearcă din nou." }, form);
    } finally {
      setPending(false);
    }
  }

  function clearError(e: React.FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    if (name && errors[name]) {
      setErrors((current) => {
        const rest = { ...current };
        delete rest[name];
        return rest;
      });
    }
  }

  const invalid = (name: string) => (errors[name] ? true : undefined);

  return (
    <form
      onSubmit={handleSubmit}
      onInput={clearError}
      noValidate
      className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6"
    >
      {slugLocked ? (
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-taupe-700">Adresa (slug)</span>
          <span className="rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-taupe-600">
            /{d.slug}
          </span>
          <span className="text-xs text-taupe-400">
            Adresa nu se schimbă după creare, ca linkurile existente și Google
            să rămână valide.
          </span>
        </div>
      ) : (
        <Field
          label="Slug (adresa din URL)"
          hint="Lasă gol pentru generare automată din nume. Nu se mai poate schimba după creare."
          error={errors.slug}
        >
          <input
            name="slug"
            defaultValue={d.slug}
            aria-invalid={invalid("slug")}
            className={controlClass(!!errors.slug)}
          />
        </Field>
      )}

      <TranslateBar pairs={TRANSLATE_PAIRS} />

      <Field label="Nume (Română)" required error={errors.roName}>
        <input
          name="roName"
          defaultValue={d.roName}
          aria-invalid={invalid("roName")}
          className={controlClass(!!errors.roName)}
        />
      </Field>

      <Field label="Titlu pagină (Română)" hint="Opțional. Titlul mare de pe pagina categoriei; dacă lipsește, se folosește numele.">
        <input name="roHeadline" defaultValue={d.roHeadline} className={controlClass()} />
      </Field>

      <Field label="Descriere (Română)" hint="Apare sub titlu și în Google.">
        <textarea
          name="roDescription"
          defaultValue={d.roDescription}
          rows={3}
          className={controlClass()}
        />
      </Field>

      <Field
        label="Nume (Engleză)"
        hint="Opțional — dacă lipsește, se afișează numele în română."
      >
        <input name="enName" defaultValue={d.enName} className={controlClass()} />
      </Field>

      <Field label="Titlu pagină (Engleză)">
        <input name="enHeadline" defaultValue={d.enHeadline} className={controlClass()} />
      </Field>

      <Field label="Descriere (Engleză)">
        <textarea
          name="enDescription"
          defaultValue={d.enDescription}
          rows={3}
          className={controlClass()}
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-taupe-700">
          Culoare pentru cardurile fără poză
          <span className="ml-1 text-red-600">*</span>
        </legend>
        <div className="flex flex-wrap gap-3">
          {CATEGORY_COLORS.map((c) => (
            <label
              key={c.key}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-sm text-taupe-700 ${
                color === c.key
                  ? "border-salamander-500 bg-salamander-50"
                  : "border-cream-200 hover:border-salamander-400"
              }`}
            >
              <input
                type="radio"
                name="color"
                value={c.key}
                checked={color === c.key}
                onChange={() => setColor(c.key)}
                className="sr-only"
              />
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm ${c.className}`}
              >
                Aa
              </span>
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Ordine în meniu"
        hint="Categoriile cu numere mai mici apar primele."
        error={errors.sortOrder}
      >
        <input
          name="sortOrder"
          type="number"
          defaultValue={d.sortOrder}
          aria-invalid={invalid("sortOrder")}
          className={controlClass(!!errors.sortOrder)}
        />
      </Field>

      {hasErrors(errors) && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errors._form ??
            "Categoria nu a fost salvată. Corectează câmpurile marcate cu roșu și apasă din nou."}
        </p>
      )}

      <SubmitButton label={submitLabel} pending={pending} />
    </form>
  );
}
