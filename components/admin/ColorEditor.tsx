"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { controlClass, FieldError } from "@/components/admin/FormBits";
import { normalizeHex, swatchStyle } from "@/lib/colors-shared";
import {
  createColorAction,
  deleteColorAction,
  setUsesColorsAction,
  updateColorAction,
} from "@/lib/admin/color-actions";
import type { FormErrors } from "@/lib/admin/form-validation";

export type ColorItem = {
  id: string;
  slug: string;
  nameRo: string;
  nameEn: string;
  hex: string;
  swatchImage: boolean;
  sortOrder: number;
  isActive: boolean;
};

function Swatch({ hex, slug, photo }: { hex: string; slug?: string; photo?: boolean }) {
  return photo && slug ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/colors/${slug}.webp`}
      alt=""
      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-cream-300"
    />
  ) : (
    <span
      className="h-10 w-10 shrink-0 rounded-full ring-1 ring-cream-300"
      style={swatchStyle(hex)}
      aria-hidden="true"
    />
  );
}

// One colour: number, name (RO/EN), hex (typed or picked) and whether it can be
// chosen by customers. `item` is null for the "add a colour" row.
function ColorRow({
  mainId,
  item,
  nextNumber,
}: {
  mainId: string;
  item: ColorItem | null;
  nextNumber: number;
}) {
  const router = useRouter();
  const [hex, setHex] = useState(item?.hex ?? "#C0A080");
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setSaved(false);
    try {
      const result = item
        ? await updateColorAction(item.id, formData)
        : await createColorAction(mainId, formData);
      if ("errors" in result) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      setSaved(true);
      if (!item) {
        setHex("#C0A080");
        setFormKey((k) => k + 1);
      }
      router.refresh();
    } catch {
      setErrors({ _form: "Nu am putut salva. Încearcă din nou." });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`Ștergi culoarea „${item.nameRo}”?`)) return;
    setPending(true);
    const result = await deleteColorAction(item.id);
    setPending(false);
    if ("error" in result) {
      setErrors({ _form: result.error });
      return;
    }
    router.refresh();
  }

  const pickerValue = normalizeHex(hex) ?? "#000000";

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-cream-300 bg-white shadow-sm p-4"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Swatch hex={hex} slug={item?.slug} photo={item?.swatchImage && pickerValue === normalizeHex(item.hex)} />

        <label className="flex w-20 flex-col gap-1 text-xs text-taupe-500">
          Nr.
          <input
            name="sortOrder"
            type="number"
            defaultValue={item ? item.sortOrder : nextNumber}
            aria-invalid={!!errors.sortOrder}
            className={controlClass(!!errors.sortOrder)}
          />
        </label>

        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-taupe-500">
          Nume (Română)
          <input
            name="nameRo"
            defaultValue={item?.nameRo ?? ""}
            aria-invalid={!!errors.nameRo}
            className={controlClass(!!errors.nameRo)}
          />
        </label>

        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-taupe-500">
          Nume (Engleză)
          <input
            name="nameEn"
            defaultValue={item?.nameEn ?? ""}
            className={controlClass()}
          />
        </label>

        <div className="flex flex-col gap-1 text-xs text-taupe-500">
          Culoare (hex)
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={pickerValue}
              onChange={(e) => setHex(e.target.value.toUpperCase())}
              aria-label="Alege culoarea din paletă"
              className="h-10 w-12 cursor-pointer rounded-lg border border-cream-300 bg-white shadow-sm p-1"
            />
            <input
              name="hex"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              aria-invalid={!!errors.hex}
              placeholder="#C0A080"
              className={`${controlClass(!!errors.hex)} w-28 font-mono`}
            />
          </div>
        </div>
      </div>

      {errors.nameRo && <FieldError message={errors.nameRo} />}
      {errors.hex && <FieldError message={errors.hex} />}
      {errors.sortOrder && <FieldError message={errors.sortOrder} />}
      {errors._form && <FieldError message={errors._form} />}
      {item?.swatchImage && (
        <p className="text-xs text-taupe-400">
          Are poză de textură. Dacă schimbi culoarea hex, în magazin se
          afișează cercul în noua culoare.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {item ? (
          <label className="flex items-center gap-2 text-sm text-taupe-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={item.isActive}
              className="h-4 w-4 rounded border-cream-200"
            />
            Activă (clienții o pot alege)
          </label>
        ) : (
          <span className="text-xs text-taupe-400">
            Culoarea nouă apare imediat în magazin.
          </span>
        )}
        <div className="flex items-center gap-4">
          {saved && !pending && (
            <span className="text-xs font-medium text-green-700">Salvat</span>
          )}
          {item && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Șterge
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
          >
            {pending ? "Se salvează..." : item ? "Salvează" : "Adaugă culoarea"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ColorEditor({
  mainId,
  mainName,
  usesColors,
  colors,
}: {
  mainId: string;
  mainName: string;
  usesColors: boolean;
  colors: ColorItem[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(usesColors);
  const [busy, setBusy] = useState(false);

  async function toggle(value: boolean) {
    setBusy(true);
    setEnabled(value);
    try {
      await setUsesColorsAction(mainId, value);
      router.refresh();
    } catch {
      setEnabled(!value);
    } finally {
      setBusy(false);
    }
  }

  const nextNumber = Math.max(0, ...colors.map((c) => c.sortOrder)) + 1;

  return (
    <div className="flex flex-col gap-5">
      <label className="flex items-start gap-3 rounded-2xl border border-cream-300 bg-white shadow-sm p-5 text-sm text-taupe-700">
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-cream-200"
        />
        <span>
          <span className="font-medium text-taupe-800">
            Produsele din „{mainName}” se fac la comandă, în culoarea aleasă de
            client
          </span>
          <br />
          <span className="text-xs text-taupe-500">
            Bifat: în magazin apare paleta de mai jos, iar la produse apare
            opțiunea „Clientul alege culorile”. Debifat: categoria nu arată
            deloc culori, nici în magazin, nici în formularul de produs.
          </span>
        </span>
      </label>

      {enabled && (
        <>
          <p className="max-w-2xl text-sm text-taupe-500">
            Culorile de mai jos sunt singurele pe care le pot alege clienții.
            „Nr.” e ordinea în care apar în magazin. Poți scrie valoarea hex
            direct sau alege culoarea din selector.
          </p>
          <div className="flex flex-col gap-3">
            {colors.map((c) => (
              <ColorRow
                key={`${c.id}-${c.hex}-${c.nameRo}-${c.nameEn}-${c.sortOrder}-${c.isActive}`}
                mainId={mainId}
                item={c}
                nextNumber={nextNumber}
              />
            ))}
          </div>

          <h2 className="font-display text-lg text-taupe-800">
            Adaugă o culoare nouă
          </h2>
          <ColorRow mainId={mainId} item={null} nextNumber={nextNumber} />
        </>
      )}
    </div>
  );
}
