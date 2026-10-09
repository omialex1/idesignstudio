"use client";

import { useState } from "react";
import {
  hasErrors,
  validateSubcategoryForm,
  type FormErrors,
} from "@/lib/admin/form-validation";
import SubmitButton from "@/components/admin/SubmitButton";
import { Field, TranslateBar, controlClass } from "@/components/admin/FormBits";

export type SubcategoryFormDefaults = {
  mainCategoryId: string;
  slug: string;
  roName: string;
  roDescription: string;
  enName: string;
  enDescription: string;
  sortOrder: number;
};

const TRANSLATE_PAIRS: [string, string][] = [
  ["roName", "enName"],
  ["roDescription", "enDescription"],
];

export default function SubcategoryForm({
  onSubmit,
  mainCategories,
  defaultValues,
  submitLabel,
}: {
  // Resolves to { errors } when the server rejects the data (nothing on success).
  onSubmit: (formData: FormData) => Promise<unknown>;
  mainCategories: { id: string; name: string }[];
  defaultValues?: SubcategoryFormDefaults;
  submitLabel: string;
}) {
  const d: SubcategoryFormDefaults = defaultValues ?? {
    mainCategoryId: "",
    slug: "",
    roName: "",
    roDescription: "",
    enName: "",
    enDescription: "",
    sortOrder: 0,
  };

  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

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

    const clientErrors = validateSubcategoryForm(formData);
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
      showErrors(
        { _form: "Nu am putut salva subcategoria. Încearcă din nou." },
        form,
      );
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
      <Field label="Categorie principală" required error={errors.mainCategoryId}>
        <select
          name="mainCategoryId"
          defaultValue={d.mainCategoryId}
          aria-invalid={invalid("mainCategoryId")}
          className={controlClass(!!errors.mainCategoryId, "bg-white")}
        >
          <option value="">— Alege categoria —</option>
          {mainCategories.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Slug (URL)"
        hint="Lasă gol pentru generare automată din nume."
        error={errors.slug}
      >
        <input
          name="slug"
          defaultValue={d.slug}
          aria-invalid={invalid("slug")}
          className={controlClass(!!errors.slug)}
        />
      </Field>

      <TranslateBar pairs={TRANSLATE_PAIRS} />

      <Field label="Nume (Română)" required error={errors.roName}>
        <input
          name="roName"
          defaultValue={d.roName}
          aria-invalid={invalid("roName")}
          className={controlClass(!!errors.roName)}
        />
      </Field>

      <Field label="Descriere (Română)">
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

      <Field label="Descriere (Engleză)">
        <textarea
          name="enDescription"
          defaultValue={d.enDescription}
          rows={3}
          className={controlClass()}
        />
      </Field>

      <Field
        label="Ordine afișare"
        hint="Subcategoriile cu numere mai mici apar primele."
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
            "Subcategoria nu a fost salvată. Corectează câmpurile marcate cu roșu și apasă din nou."}
        </p>
      )}

      <SubmitButton label={submitLabel} pending={pending} />
    </form>
  );
}
