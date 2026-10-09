"use client";

import { useState } from "react";
import { lineConfig } from "@/lib/lines";
import {
  PIECE_SLOTS,
  VARIANT_SLOTS,
  hasErrors,
  validateProductForm,
  type FormErrors,
} from "@/lib/admin/form-validation";
import SubmitButton from "@/components/admin/SubmitButton";
import {
  Field,
  FieldError,
  TranslateBar,
  controlClass,
} from "@/components/admin/FormBits";
import type { ProductLine } from "@/lib/generated/prisma";

type CategoryOption = { id: string; name: string; line: ProductLine };

export type PieceDefaults = {
  nameRo: string;
  nameEn: string;
  maxColors: number;
};

export type VariantDefaults = {
  nameRo: string;
  nameEn: string;
  priceRon: string;
  discount: string;
  pieces: PieceDefaults[];
};

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
  components: PieceDefaults[];
  quantityOnHand: number;
  lowStockThreshold: number;
  isActive: boolean;
};

const TRANSLATE_PAIRS: [string, string][] = [
  ["roName", "enName"],
  ["roDescription", "enDescription"],
  ["roLongDescription", "enLongDescription"],
  ...Array.from(
    { length: VARIANT_SLOTS },
    (_, i): [string, string] => [`variantNameRo${i}`, `variantNameEn${i}`],
  ),
  ...Array.from(
    { length: PIECE_SLOTS },
    (_, i): [string, string] => [`componentNameRo${i}`, `componentNameEn${i}`],
  ),
  ...Array.from({ length: VARIANT_SLOTS }, (_, i) =>
    Array.from(
      { length: PIECE_SLOTS },
      (_, j): [string, string] => [
        `variantPieceNameRo${i}_${j}`,
        `variantPieceNameEn${i}_${j}`,
      ],
    ),
  ).flat(),
];

export default function ProductForm({
  onSubmit,
  categories,
  defaultValues,
  submitLabel,
  extra,
}: {
  // Resolves to { errors } when the server rejects the data (nothing on success).
  onSubmit: (formData: FormData) => Promise<unknown>;
  categories: CategoryOption[];
  defaultValues?: ProductFormDefaults;
  submitLabel: string;
  // Extra sections shown just above the submit button (e.g. photos).
  extra?: React.ReactNode;
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

  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  function showErrors(next: FormErrors, form: HTMLFormElement) {
    setErrors(next);
    // Bring the first problem into view.
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

    const clientErrors = validateProductForm(formData);
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
        { _form: "Nu am putut salva produsul. Încearcă din nou." },
        form,
      );
    } finally {
      setPending(false);
    }
  }

  // Typing in a field clears its error message.
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
      className="flex max-w-2xl flex-col gap-8"
    >
      <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
        <h2 className="font-display text-lg text-taupe-800">General</h2>

        <Field label="Categorie" required error={errors.categoryId}>
          <select
            name="categoryId"
            defaultValue={d.categoryId}
            aria-invalid={invalid("categoryId")}
            className={controlClass(!!errors.categoryId, "bg-white")}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({lineConfig(c.line).adminLabel})
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

        <Field
          label="Descriere scurtă (Română)"
          hint="Apare pe card și în Google."
        >
          <textarea
            name="roDescription"
            defaultValue={d.roDescription}
            rows={3}
            className={controlClass()}
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
            className={controlClass()}
          />
        </Field>

        <Field
          label="Nume (Engleză)"
          hint="Opțional — dacă lipsește, se afișează numele în română."
        >
          <input
            name="enName"
            defaultValue={d.enName}
            className={controlClass()}
          />
        </Field>

        <Field label="Descriere scurtă (Engleză)">
          <textarea
            name="enDescription"
            defaultValue={d.enDescription}
            rows={3}
            className={controlClass()}
          />
        </Field>

        <Field label="Descriere detaliată (Engleză)">
          <textarea
            name="enLongDescription"
            defaultValue={d.enLongDescription}
            rows={10}
            className={controlClass()}
          />
        </Field>

        <Field
          label="Preț (RON)"
          required
          hint="Lasă gol doar dacă produsul are variante cu preț propriu (mai jos)."
          error={errors.priceRon}
        >
          <input
            name="priceRon"
            type="number"
            step="0.01"
            min="0"
            defaultValue={d.priceRon}
            aria-invalid={invalid("priceRon")}
            className={controlClass(!!errors.priceRon)}
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
            Piese și culori (produse fără variante)
          </h2>
          <p className="mt-1 text-xs text-taupe-400">
            Pentru produsele la care clientul alege culorile (bifa de mai sus)
            și care nu au variante. Adaugă fiecare piesă (ex: Ghiveci, Farfurie),
            iar clientul alege câte o culoare pentru fiecare. Dacă nu adaugi
            nimic, clientul alege o singură culoare pentru întregul produs. La
            produsele cu variante, piesele se definesc în fiecare variantă,
            mai jos.
          </p>
        </div>
        {Array.from({ length: PIECE_SLOTS }, (_, i) => {
          const c = d.components[i];
          const error = errors[`componentNameRo${i}`];
          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-3">
                <input
                  name={`componentNameRo${i}`}
                  defaultValue={c?.nameRo ?? ""}
                  placeholder={`Piesa ${i + 1} (Română)`}
                  aria-invalid={invalid(`componentNameRo${i}`)}
                  className={controlClass(!!error)}
                />
                <input
                  name={`componentNameEn${i}`}
                  defaultValue={c?.nameEn ?? ""}
                  placeholder="(Engleză)"
                  className={controlClass()}
                />
              </div>
              {error && <FieldError message={error} />}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
        <div>
          <h2 className="font-display text-lg text-taupe-800">
            Variante (seturi)
          </h2>
          <p className="mt-1 text-xs text-taupe-400">
            Opțional. Fiecare variantă este ce cumpără clientul (ex: Mare, Mic,
            Set), cu prețul ei și cu piesele ei. Reducerea (%) se scade din
            prețul variantei, deci o pui doar la seturi. Clientul alege culorile
            doar pentru piesele variantei alese. O variantă lăsată goală nu se
            folosește. Dacă ai variante, prețul de mai sus se ignoră.
          </p>
        </div>
        {Array.from({ length: VARIANT_SLOTS }, (_, i) => {
          const v = d.variants[i];
          const nameError = errors[`variantNameRo${i}`];
          const priceError = errors[`variantPriceRon${i}`];
          const discountError = errors[`variantDiscount${i}`];
          return (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-cream-200 p-4"
            >
              <p className="text-sm font-medium text-taupe-700">
                Varianta {i + 1}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name={`variantNameRo${i}`}
                  defaultValue={v?.nameRo ?? ""}
                  placeholder="Nume (Română), ex: Set mare + mic"
                  aria-invalid={invalid(`variantNameRo${i}`)}
                  className={controlClass(!!nameError)}
                />
                <input
                  name={`variantNameEn${i}`}
                  defaultValue={v?.nameEn ?? ""}
                  placeholder="Nume (Engleză)"
                  className={controlClass()}
                />
              </div>
              {nameError && <FieldError message={nameError} />}
              <div className="grid grid-cols-2 gap-3">
                <input
                  name={`variantPriceRon${i}`}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={v?.priceRon ?? ""}
                  placeholder="Preț (RON)"
                  aria-invalid={invalid(`variantPriceRon${i}`)}
                  className={controlClass(!!priceError)}
                />
                <input
                  name={`variantDiscount${i}`}
                  type="number"
                  step="1"
                  min="0"
                  max="90"
                  defaultValue={v?.discount ?? ""}
                  placeholder="Reducere % (opțional)"
                  aria-invalid={invalid(`variantDiscount${i}`)}
                  className={controlClass(!!discountError)}
                />
              </div>
              {priceError && <FieldError message={priceError} />}
              {discountError && <FieldError message={discountError} />}

              <p className="mt-1 text-xs font-medium text-taupe-600">
                Piese și culori pentru această variantă
              </p>
              {Array.from({ length: PIECE_SLOTS }, (_, j) => {
                const piece = v?.pieces[j];
                const pieceError = errors[`variantPieceNameRo${i}_${j}`];
                return (
                  <div key={j} className="flex flex-col gap-1.5">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        name={`variantPieceNameRo${i}_${j}`}
                        defaultValue={piece?.nameRo ?? ""}
                        placeholder={`Piesa ${j + 1} (Română)`}
                        aria-invalid={invalid(`variantPieceNameRo${i}_${j}`)}
                        className={controlClass(!!pieceError)}
                      />
                      <input
                        name={`variantPieceNameEn${i}_${j}`}
                        defaultValue={piece?.nameEn ?? ""}
                        placeholder="(Engleză)"
                        className={controlClass()}
                      />
                    </div>
                    {pieceError && <FieldError message={pieceError} />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
        <h2 className="font-display text-lg text-taupe-800">Inventar</h2>

        <Field label="Cantitate în stoc" required error={errors.quantityOnHand}>
          <input
            name="quantityOnHand"
            type="number"
            min="0"
            defaultValue={d.quantityOnHand}
            aria-invalid={invalid("quantityOnHand")}
            className={controlClass(!!errors.quantityOnHand)}
          />
        </Field>

        <Field
          label="Prag stoc redus"
          required
          hint="Sub această cantitate, produsul apare ca „stoc redus”."
          error={errors.lowStockThreshold}
        >
          <input
            name="lowStockThreshold"
            type="number"
            min="0"
            defaultValue={d.lowStockThreshold}
            aria-invalid={invalid("lowStockThreshold")}
            className={controlClass(!!errors.lowStockThreshold)}
          />
        </Field>
      </section>

      {extra}

      {hasErrors(errors) && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errors._form ??
            "Produsul nu a fost salvat. Corectează câmpurile marcate cu roșu și apasă din nou."}
        </p>
      )}

      <SubmitButton label={submitLabel} pending={pending} />
    </form>
  );
}
