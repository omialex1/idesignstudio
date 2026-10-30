"use client";

import { isRedirectError } from "@/lib/admin/redirect-error";
import AdminCard from "@/components/admin/AdminCard";
import type { PaletteOption } from "@/lib/admin/queries";
import { swatchStyle } from "@/lib/colors-shared";
import { useState } from "react";
import {
  INITIAL_PIECE_ROWS,
  INITIAL_VARIANT_ROWS,
  PIECE_SLOTS,
  TIER_SLOTS,
  VARIANT_SLOTS,
  hasErrors,
  validateProductForm,
  type FormErrors,
} from "@/lib/admin/form-validation";
import SubmitButton from "@/components/admin/SubmitButton";
import { createSubcategory } from "@/lib/admin/subcategory-actions";
import RichTextField from "@/components/admin/RichTextField";
import {
  Field,
  FieldError,
  TranslateBar,
  controlClass,
} from "@/components/admin/FormBits";
type CategoryOption = { id: string; name: string; mainCategoryId: string };
type MainCategoryOption = { id: string; name: string };

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

export type TierDefaults = { min: string; priceRon: string };

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
  // slugs of the category colours this product does NOT offer
  excludedColors: string[];
  tieredPricing: boolean;
  tiers: TierDefaults[];
  variants: VariantDefaults[];
  components: PieceDefaults[];
  quantityOnHand: number;
  lowStockThreshold: number;
  isActive: boolean;
};

// Text areas that grow with their content (within limits), so short texts stay small.
const TEXT_GROW = "field-sizing-content min-h-[3.25rem] max-h-48 resize-y";

const TRANSLATE_PAIRS: [string, string][] = [
  ["roName", "enName"],
  ["roDescription", "enDescription"],
  ["roLongDescription", "enLongDescription"],
  ...Array.from({ length: VARIANT_SLOTS }, (_, i): [string, string] => [
    `variantNameRo${i}`,
    `variantNameEn${i}`,
  ]),
  ...Array.from({ length: PIECE_SLOTS }, (_, i): [string, string] => [
    `componentNameRo${i}`,
    `componentNameEn${i}`,
  ]),
  ...Array.from({ length: VARIANT_SLOTS }, (_, i) =>
    Array.from({ length: PIECE_SLOTS }, (_, j): [string, string] => [
      `variantPieceNameRo${i}_${j}`,
      `variantPieceNameEn${i}_${j}`,
    ]),
  ).flat(),
];

export default function ProductForm({
  onSubmit,
  categories,
  mainCategories,
  colorMainIds = [],
  palettes = {},
  defaultValues,
  submitLabel,
  extra,
  createSubcategoryAction = createSubcategory,
}: {
  // Resolves to { errors } when the server rejects the data (nothing on success).
  onSubmit: (formData: FormData) => Promise<unknown>;
  categories: CategoryOption[];
  mainCategories: MainCategoryOption[];
  // main categories whose products are made in a colour the customer picks
  colorMainIds?: string[];
  // the colours of each main category that uses colours (to pick the ones offered)
  palettes?: Record<string, PaletteOption[]>;
  defaultValues?: ProductFormDefaults;
  submitLabel: string;
  // Extra sections shown just above the submit button (e.g. photos).
  extra?: React.ReactNode;
  createSubcategoryAction?: typeof createSubcategory;
}) {
  const d: ProductFormDefaults = defaultValues ?? {
    categoryId: "",
    slug: "",
    roName: "",
    roDescription: "",
    roLongDescription: "",
    enName: "",
    enDescription: "",
    enLongDescription: "",
    priceRon: "",
    hasColorOptions: true,
    excludedColors: [],
    tieredPricing: false,
    tiers: [],
    variants: [],
    components: [],
    quantityOnHand: 0,
    lowStockThreshold: 5,
    isActive: true,
  };

  const [tiered, setTiered] = useState(d.tieredPricing);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  // Names and descriptions are shown one language at a time.
  const [lang, setLang] = useState<"ro" | "en">("ro");

  // Only one variant is edited at a time; the list picks which one is shown.
  const [activeVariant, setActiveVariant] = useState(0);
  const [variantNames, setVariantNames] = useState<string[]>(() =>
    Array.from(
      { length: VARIANT_SLOTS },
      (_, i) => d.variants[i]?.nameRo ?? "",
    ),
  );

  // How many variant rows and piece rows are shown. They start at the usual
  // number (or at what the product already has) and the "Adaugă" buttons add more.
  const [variantRows, setVariantRows] = useState(() =>
    Math.min(VARIANT_SLOTS, Math.max(INITIAL_VARIANT_ROWS, d.variants.length)),
  );
  const [pieceRows, setPieceRows] = useState(() =>
    Math.min(PIECE_SLOTS, Math.max(INITIAL_PIECE_ROWS, d.components.length)),
  );
  const [variantPieceRows, setVariantPieceRows] = useState<number[]>(() =>
    Array.from({ length: VARIANT_SLOTS }, (_, i) =>
      Math.min(
        PIECE_SLOTS,
        Math.max(INITIAL_PIECE_ROWS, d.variants[i]?.pieces.length ?? 0),
      ),
    ),
  );

  // Two steps: main category (one of the four), then one of its subcategories.
  // Only the subcategory is saved; the main category follows from it.
  const [line, setLine] = useState<string>(
    categories.find((c) => c.id === d.categoryId)?.mainCategoryId ?? "",
  );
  const [subcategoryId, setSubcategoryId] = useState(d.categoryId);
  // Subcategories created from this form are added to the list on the spot.
  const [created, setCreated] = useState<CategoryOption[]>([]);
  const allCategories = [...categories, ...created];
  const subcategories = allCategories.filter((c) => c.mainCategoryId === line);
  // Colour choices exist only for categories that use colours (3D prints).
  const showColors = colorMainIds.includes(line);
  // Which colours of the category this product offers (all, unless some were
  // taken out). Kept per category: changing the category starts again from "all".
  const palette = palettes[line] ?? [];
  const [colorsOn, setColorsOn] = useState(d.hasColorOptions);
  const [offered, setOffered] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      Object.values(palettes)
        .flat()
        .map((c) => [c.slug, !d.excludedColors.includes(c.slug)]),
    ),
  );
  const [adding, setAdding] = useState(false);
  const [newNameRo, setNewNameRo] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function addSubcategory() {
    if (!line) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createSubcategoryAction(line, newNameRo, newNameEn);
      if ("error" in result) {
        setCreateError(result.error);
        return;
      }
      setCreated((list) => [...list, result]);
      setSubcategoryId(result.id);
      setErrors((current) => {
        const rest = { ...current };
        delete rest.categoryId;
        return rest;
      });
      setAdding(false);
      setNewNameRo("");
      setNewNameEn("");
    } catch {
      setCreateError("Nu am putut crea subcategoria. Încearcă din nou.");
    } finally {
      setCreating(false);
    }
  }

  function variantWithError(errs: FormErrors): number | null {
    for (const key of Object.keys(errs)) {
      const m = /^variant\w*?(\d+)(?:_\d+)?$/.exec(key);
      if (m) return Number(m[1]);
    }
    return null;
  }

  function showErrors(next: FormErrors, form: HTMLFormElement) {
    setErrors(next);
    const bad = variantWithError(next);
    if (bad !== null) setActiveVariant(bad);
    if (next.roName) setLang("ro");
    // Bring the first problem into view (after the right variant is shown).
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        first?.focus({ preventScroll: true });
      }),
    );
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
    let leaving = false;
    try {
      const result = (await onSubmit(formData)) as
        { errors?: FormErrors } | undefined;
      if (result?.errors && hasErrors(result.errors)) {
        showErrors(result.errors, form);
      }
    } catch (err) {
      if (isRedirectError(err)) {
        // saved: the page is moving on (the button stays disabled until it does)
        leaving = true;
      } else {
        showErrors(
          { _form: "Nu am putut salva produsul. Încearcă din nou." },
          form,
        );
      }
    } finally {
      if (!leaving) setPending(false);
    }
  }

  // Typing in a field clears its error message.
  function clearError(e: React.FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    const variantName = /^variantNameRo(\d+)$/.exec(name ?? "");
    if (variantName) {
      const index = Number(variantName[1]);
      const value = (e.target as HTMLInputElement).value;
      setVariantNames((list) => list.map((n, i) => (i === index ? value : n)));
    }
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
      <AdminCard title="General" bodyClassName="flex flex-col gap-4 p-6">

        <Field label="Categorie principală" required>
          <select
            value={line}
            onChange={(e) => {
              setLine(e.target.value);
              setSubcategoryId("");
            }}
            className={controlClass(false, "bg-white")}
          >
            <option value="">— Alege categoria —</option>
            {mainCategories.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subcategorie" required error={errors.categoryId}>
          <select
            name="categoryId"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            disabled={!line || subcategories.length === 0}
            aria-invalid={invalid("categoryId")}
            className={controlClass(
              !!errors.categoryId,
              "bg-white disabled:opacity-60",
            )}
          >
            <option value="">
              {!line
                ? "Alege mai întâi categoria principală"
                : subcategories.length === 0
                  ? "Nicio subcategorie încă"
                  : "— Alege subcategoria —"}
            </option>
            {subcategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {line && (
          <div className="-mt-2 flex flex-col gap-2">
            {subcategories.length === 0 && (
              <p className="text-xs text-taupe-600">
                Această categorie nu are încă subcategorii.
              </p>
            )}
            {!adding ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-fit text-sm font-medium text-salamander-600 hover:underline"
              >
                + Adaugă subcategorie
              </button>
            ) : (
              <div
                className="flex flex-col gap-3 rounded-xl border border-cream-200 bg-cream-50 p-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // Enter here must not save the whole product.
                    e.preventDefault();
                    if (!creating) addSubcategory();
                  }
                }}
              >
                <p className="text-sm font-medium text-taupe-700">
                  Subcategorie nouă în{" "}
                  {mainCategories.find((m) => m.id === line)?.name}
                </p>
                <input
                  value={newNameRo}
                  onChange={(e) => setNewNameRo(e.target.value)}
                  placeholder="Nume (Română)"
                  autoFocus
                  className={controlClass(!!createError)}
                />
                <input
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  placeholder="Nume (Engleză), opțional"
                  className={controlClass()}
                />
                {createError && <FieldError message={createError} />}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={addSubcategory}
                    className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
                  >
                    {creating ? "Se creează..." : "Creează subcategoria"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setCreateError(null);
                    }}
                    className="rounded-full border border-cream-300 px-5 py-2 text-sm font-semibold text-taupe-700 hover:bg-cream-100"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
      </AdminCard>

      <section className="overflow-hidden rounded-2xl border-2 border-choc bg-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-choc px-6 py-3 text-cream-50">
          <h2 className="font-display text-xl">Nume și descrieri</h2>
          <div
            role="tablist"
            aria-label="Limba textelor"
            className="flex rounded-full bg-white/10 p-1 text-sm font-semibold"
          >
            {(
              [
                ["ro", "Română"],
                ["en", "Engleză"],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={lang === code}
                onClick={() => setLang(code)}
                className={`rounded-full px-5 py-1.5 transition-colors ${
                  lang === code
                    ? "bg-gold-400 text-choc hover:bg-gold-300"
                    : "text-cream-100 hover:bg-white/10"
                }`}
              >
                {label}
                {code === "ro" && errors.roName && (
                  <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <TranslateBar pairs={TRANSLATE_PAIRS} />

          <div className={lang === "ro" ? "flex flex-col gap-4" : "hidden"}>
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
              hint="Apare pe card și în Google. Câmpul crește singur cu textul."
            >
              <textarea
                name="roDescription"
                defaultValue={d.roDescription}
                rows={2}
                className={controlClass(false, TEXT_GROW)}
              />
            </Field>

            <RichTextField
              name="roLongDescription"
              label="Descriere detaliată (Română)"
              hint="Apare pe pagina produsului. Rândurile noi se păstrează."
              defaultValue={d.roLongDescription}
            />
          </div>

          <div className={lang === "en" ? "flex flex-col gap-4" : "hidden"}>
            <Field
              label="Nume (Engleză)"
              hint="Opțional: dacă lipsește, se afișează numele în română."
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
                rows={2}
                className={controlClass(false, TEXT_GROW)}
              />
            </Field>

            <RichTextField
              name="enLongDescription"
              label="Descriere detaliată (Engleză)"
              defaultValue={d.enLongDescription}
            />
          </div>
        </div>
      </section>

      <AdminCard title="Preț și afișare" bodyClassName="flex flex-col gap-4 p-6">

        <label className="flex items-center gap-2 text-sm text-taupe-700">
          <input
            type="checkbox"
            name="tieredPricing"
            checked={tiered}
            onChange={(e) => setTiered(e.target.checked)}
            className="h-4 w-4 rounded border-cream-200"
          />
          Preț pe cantitate (ex: invitații – clientul scrie câte bucăți vrea,
          iar prețul se alege automat)
        </label>

        {tiered && (
          <div className="flex flex-col gap-3 rounded-xl border border-cream-200 p-4">
            <p className="text-xs text-taupe-400">
              Fiecare nivel: de la câte bucăți începe și prețul pe bucată.
              Nivelul se termină unde începe următorul. Clientul vede nivelurile
              doar ca informare. Variantele și piesele de mai jos nu se
              folosesc.
            </p>
            {Array.from({ length: TIER_SLOTS }, (_, i) => {
              const tier = d.tiers[i];
              const minError = errors[`tierMin${i}`];
              const priceError = errors[`tierPriceRon${i}`];
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name={`tierMin${i}`}
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={tier?.min ?? ""}
                      placeholder={`Nivel ${i + 1}: de la câte buc.`}
                      aria-invalid={invalid(`tierMin${i}`)}
                      className={controlClass(!!minError)}
                    />
                    <input
                      name={`tierPriceRon${i}`}
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={tier?.priceRon ?? ""}
                      placeholder="Preț / buc (RON)"
                      aria-invalid={invalid(`tierPriceRon${i}`)}
                      className={controlClass(!!priceError)}
                    />
                  </div>
                  {minError && <FieldError message={minError} />}
                  {priceError && <FieldError message={priceError} />}
                </div>
              );
            })}
            <p className="text-xs text-taupe-400">
              Stocul de mai jos limitează câte bucăți poate comanda clientul.
            </p>
          </div>
        )}

        <div className={tiered ? "hidden" : ""}>
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
        </div>

        {showColors ? (
          <label className="flex items-center gap-2 text-sm text-taupe-700">
            <input
              type="checkbox"
              name="hasColorOptions"
              defaultChecked={d.hasColorOptions}
              onChange={(e) => setColorsOn(e.target.checked)}
              className="h-4 w-4 rounded border-cream-200"
            />
            Clientul alege culorile (produs făcut la comandă)
          </label>
        ) : (
          line && (
            <p className="text-xs text-taupe-400">
              Această categorie nu are culori de ales, deci produsul nu are
              opțiunea de culoare. Culorile se activează la categorie, în meniul
              „Culori”.
            </p>
          )
        )}

        <label className="flex items-center gap-2 text-sm text-taupe-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={d.isActive}
            className="h-4 w-4 rounded border-cream-200"
          />
          Vizibil pe site
        </label>
      </AdminCard>

      {showColors && colorsOn && palette.length > 0 && (
        <AdminCard
          title="Culori disponibile pentru acest produs"
          bodyClassName="flex flex-col gap-3 p-6"
        >
          <input type="hidden" name="colorChoiceShown" value="1" />
          <div>
            <p className="text-xs text-taupe-400">
              Bifează culorile din categorie pe care clientul le poate alege la
              acest produs. Culoarea debifată nu apare la produs și nu se poate
              comanda. O culoare nouă adăugată în categorie apare singură aici
              și la produs, bifată.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={() =>
                setOffered((cur) => ({
                  ...cur,
                  ...Object.fromEntries(palette.map((c) => [c.slug, true])),
                }))
              }
              className="rounded-full border border-taupe-400 px-3 py-1 text-xs font-medium text-taupe-700 hover:bg-cream-100"
            >
              Bifează toate
            </button>
            <button
              type="button"
              onClick={() =>
                setOffered((cur) => ({
                  ...cur,
                  ...Object.fromEntries(palette.map((c) => [c.slug, false])),
                }))
              }
              className="rounded-full border border-taupe-400 px-3 py-1 text-xs font-medium text-taupe-700 hover:bg-cream-100"
            >
              Debifează toate
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {palette.map((c) => (
              <li key={c.slug}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-700 hover:border-salamander-400">
                  <input
                    type="checkbox"
                    name="allowedColor"
                    value={c.slug}
                    checked={offered[c.slug] ?? true}
                    onChange={(e) =>
                      setOffered((cur) => ({ ...cur, [c.slug]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-cream-200"
                  />
                  {c.swatchImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/colors/${c.slug}.webp`}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-cream-300"
                    />
                  ) : (
                    <span
                      className="h-6 w-6 shrink-0 rounded-full ring-1 ring-cream-300"
                      style={swatchStyle(c.hex)}
                      aria-hidden="true"
                    />
                  )}
                  {c.nameRo}
                </label>
              </li>
            ))}
          </ul>
          {errors.allowedColor && <FieldError message={errors.allowedColor} />}
        </AdminCard>
      )}

      <AdminCard
        title="Piese și culori (produse fără variante)"
        className={showColors && !tiered ? "" : "hidden"}
        bodyClassName="flex flex-col gap-4 p-6"
      >
        <div>
          <p className="text-xs text-taupe-400">
            Pentru produsele la care clientul alege culorile (bifa de mai sus)
            și care nu au variante. Adaugă fiecare piesă (ex: Ghiveci,
            Farfurie), iar clientul alege câte o culoare pentru fiecare. Dacă nu
            adaugi nimic, clientul alege o singură culoare pentru întregul
            produs. La produsele cu variante, piesele se definesc în fiecare
            variantă, mai jos.
          </p>
        </div>
        {Array.from({ length: pieceRows }, (_, i) => {
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
        {pieceRows < PIECE_SLOTS && (
          <button
            type="button"
            onClick={() => setPieceRows((n) => Math.min(PIECE_SLOTS, n + 1))}
            className="w-fit rounded-full border border-taupe-400 px-4 py-1.5 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100"
          >
            + Adaugă o piesă
          </button>
        )}
      </AdminCard>

      <AdminCard
        title="Variante (seturi)"
        className={tiered ? "hidden" : ""}
        bodyClassName="flex flex-col gap-4 p-6"
      >
        <div>
          <p className="text-xs text-taupe-400">
            Opțional. Fiecare variantă este ce cumpără clientul (ex: Mare, Mic,
            Set), cu prețul ei și cu piesele ei. Reducerea (%) face din variantă
            un set: prețul ei se calculează automat ca suma celorlalte variante,
            minus reducerea (ex: Mare + Mic, −10%). Pentru un set, câmpul de
            preț nu contează, se ignoră și se înlocuiește la salvare. Reducerea
            se pune doar la seturi. Clientul alege culorile doar pentru piesele
            variantei alese. O variantă lăsată goală nu se folosește. Dacă ai
            variante, prețul de mai sus se ignoră.
          </p>
        </div>
        <Field
          label="Variantă de editat"
          hint="Se afișează o singură variantă. Alege din listă ca să o editezi pe următoarea; cele neafișate se salvează la fel."
        >
          <select
            value={activeVariant}
            onChange={(e) => setActiveVariant(Number(e.target.value))}
            className={controlClass(false, "bg-white")}
          >
            {Array.from({ length: variantRows }, (_, i) => {
              const bad = variantWithError(errors) === i;
              const label = variantNames[i]?.trim()
                ? `Varianta ${i + 1} – ${variantNames[i].trim()}`
                : `Varianta ${i + 1} (goală)`;
              return (
                <option key={i} value={i}>
                  {bad ? `⚠ ${label}` : label}
                </option>
              );
            })}
          </select>
        </Field>
        {variantRows < VARIANT_SLOTS && (
          <button
            type="button"
            onClick={() => {
              setActiveVariant(variantRows);
              setVariantRows((n) => Math.min(VARIANT_SLOTS, n + 1));
            }}
            className="w-fit rounded-full border border-taupe-400 px-4 py-1.5 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100"
          >
            + Adaugă o variantă
          </button>
        )}
        {Array.from({ length: variantRows }, (_, i) => {
          const v = d.variants[i];
          const nameError = errors[`variantNameRo${i}`];
          const priceError = errors[`variantPriceRon${i}`];
          const discountError = errors[`variantDiscount${i}`];
          return (
            <div
              key={i}
              className={`flex flex-col gap-3 rounded-xl border border-cream-200 p-4 ${i === activeVariant ? "" : "hidden"}`}
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

              <div className={showColors ? "flex flex-col gap-3" : "hidden"}>
                <p className="mt-1 text-xs font-medium text-taupe-600">
                  Piese și culori pentru această variantă
                </p>
                {Array.from({ length: variantPieceRows[i] }, (_, j) => {
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
                {variantPieceRows[i] < PIECE_SLOTS && (
                  <button
                    type="button"
                    onClick={() =>
                      setVariantPieceRows((rows) =>
                        rows.map((n, k) =>
                          k === i ? Math.min(PIECE_SLOTS, n + 1) : n,
                        ),
                      )
                    }
                    className="w-fit rounded-full border border-taupe-400 px-4 py-1.5 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100"
                  >
                    + Adaugă o piesă
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </AdminCard>

      <AdminCard title="Inventar" bodyClassName="flex flex-col gap-4 p-6">

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
      </AdminCard>

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
