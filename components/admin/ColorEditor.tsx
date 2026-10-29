"use client";

import AdminCard from "@/components/admin/AdminCard";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { controlClass, FieldError } from "@/components/admin/FormBits";
import { normalizeHex, swatchStyle } from "@/lib/colors-shared";
import {
  createColorAction,
  deleteColorAction,
  reorderColorsAction,
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

function Swatch({
  hex,
  slug,
  photo,
}: {
  hex: string;
  slug?: string;
  photo?: boolean;
}) {
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
  position,
}: {
  mainId: string;
  item: ColorItem | null;
  nextNumber: number;
  // place in the list (1, 2, 3...) of an existing colour, for the "Nr." box
  position?: number;
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
    <form key={formKey} onSubmit={handleSubmit}>
      <AdminCard
        title={item ? item.nameRo : "Culoare nouă"}
        bodyClassName="flex flex-col gap-2 p-4"
      >
        <div className="flex flex-wrap items-start gap-3">
          <Swatch
            hex={hex}
            slug={item?.slug}
            photo={item?.swatchImage && pickerValue === normalizeHex(item.hex)}
          />

          <label className="flex w-20 flex-col gap-1 text-xs text-taupe-500">
            Nr.
            <input
              name="sortOrder"
              type="number"
              defaultValue={item ? (position ?? item.sortOrder) : nextNumber}
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
              {pending
                ? "Se salvează..."
                : item
                  ? "Salvează"
                  : "Adaugă culoarea"}
            </button>
          </div>
        </div>
      </AdminCard>
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

  // The order shown while (and right after) dragging; the saved order comes back
  // from the server with the next refresh.
  const [moved, setMoved] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState(false);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const ordered = moved
    ? [
        ...moved
          .map((id) => colors.find((c) => c.id === id))
          .filter((c): c is ColorItem => Boolean(c)),
        ...colors.filter((c) => !moved.includes(c.id)),
      ]
    : colors;

  async function saveOrder(ids: string[]) {
    setMoved(ids);
    setOrderError(false);
    try {
      await reorderColorsAction(mainId, ids);
      router.refresh();
    } catch {
      setOrderError(true);
      setMoved(null);
    }
  }

  function moveTo(id: string, targetIndex: number) {
    const ids = ordered.map((c) => c.id);
    const from = ids.indexOf(id);
    if (
      from < 0 ||
      targetIndex < 0 ||
      targetIndex >= ids.length ||
      from === targetIndex
    ) {
      return;
    }
    ids.splice(from, 1);
    ids.splice(targetIndex, 0, id);
    void saveOrder(ids);
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminCard title="Culori pentru această categorie" bodyClassName="p-5">
        <label className="flex items-start gap-3 text-sm text-taupe-700">
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy}
            onChange={(e) => toggle(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-cream-200"
          />
          <span>
            <span className="font-medium text-taupe-800">
              Produsele din „{mainName}” se fac la comandă, în culoarea aleasă
              de client
            </span>
            <br />
            <span className="text-xs text-taupe-500">
              Bifat: în magazin apare paleta de mai jos, iar la produse apare
              opțiunea „Clientul alege culorile”. Debifat: categoria nu arată
              deloc culori, nici în magazin, nici în formularul de produs.
            </span>
          </span>
        </label>
      </AdminCard>

      {enabled && (
        <>
          <p className="max-w-2xl text-sm text-taupe-500">
            Culorile de mai jos sunt singurele pe care le pot alege clienții.
            <strong className="font-medium text-taupe-700">
              {" "}
              Trage de mânerul ⠿ (sau folosește săgețile) ca să le muți.
            </strong>{" "}
            Ordinea de aici este exact ordinea în care apar în magazin. Poți
            scrie valoarea hex direct sau alege culoarea din selector.
          </p>
          {orderError && (
            <p className="text-sm text-red-600">
              Nu am putut salva ordinea. Încearcă din nou.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {ordered.map((c, index) => (
              <div
                key={c.id}
                ref={(el) => {
                  rowRefs.current[c.id] = el;
                }}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  if (overId !== c.id) setOverId(c.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== c.id) moveTo(dragId, index);
                  setDragId(null);
                  setOverId(null);
                }}
                className={`flex items-stretch gap-2 rounded-xl ${
                  overId === c.id && dragId && dragId !== c.id
                    ? "outline outline-2 outline-salamander-400"
                    : ""
                } ${dragId === c.id ? "opacity-50" : ""}`}
              >
                <div className="flex shrink-0 flex-col items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveTo(c.id, index - 1)}
                    disabled={index === 0}
                    aria-label={`Mută „${c.nameRo}” mai sus`}
                    className="rounded px-1.5 text-taupe-500 hover:bg-cream-100 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <span
                    draggable
                    onDragStart={(e) => {
                      setDragId(c.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", c.id);
                      const row = rowRefs.current[c.id];
                      if (row) e.dataTransfer.setDragImage(row, 20, 20);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    title="Trage ca să muți"
                    aria-hidden="true"
                    className="cursor-grab select-none rounded px-1.5 py-1 text-lg leading-none text-taupe-500 hover:bg-cream-100 active:cursor-grabbing"
                  >
                    ⠿
                  </span>
                  <button
                    type="button"
                    onClick={() => moveTo(c.id, index + 1)}
                    disabled={index === ordered.length - 1}
                    aria-label={`Mută „${c.nameRo}” mai jos`}
                    className="rounded px-1.5 text-taupe-500 hover:bg-cream-100 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <ColorRow
                    key={`${c.id}-${c.hex}-${c.nameRo}-${c.nameEn}-${index}-${c.isActive}`}
                    mainId={mainId}
                    item={c}
                    nextNumber={nextNumber}
                    position={index + 1}
                  />
                </div>
              </div>
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
