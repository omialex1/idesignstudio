"use client";

import { useState, useTransition } from "react";
import {
  createCodeAction,
  deleteCodeAction,
  setCodeActiveAction,
  updateCodeAction,
  type CodeInput,
  type CodeOutcome,
} from "@/lib/admin/code-actions";

const inputClass =
  "rounded-lg border border-taupe-400 bg-white px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-500 focus:ring-2 focus:ring-salamander-200";

export type CodeFormValues = {
  note: string;
  removesCodFee: boolean;
  oneUsePerCustomer: boolean;
  minSubtotal: string;
  validFrom: string;
  validUntil: string;
  maxUses: string;
};

const EMPTY: CodeFormValues = {
  note: "",
  removesCodFee: true,
  oneUsePerCustomer: true,
  minSubtotal: "",
  validFrom: "",
  validUntil: "",
  maxUses: "",
};

// The fields of a code. Used to make a new one (no `id`) and to change an existing one.
export default function CodeForm({
  id,
  initial,
}: {
  id?: string;
  initial?: CodeFormValues;
}) {
  const [values, setValues] = useState<CodeFormValues>(initial ?? EMPTY);
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CodeOutcome | null>(null);

  function set<K extends keyof CodeFormValues>(key: K, value: CodeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: CodeInput = { ...values, code };
    startTransition(async () => {
      try {
        const outcome = id
          ? await updateCodeAction(id, input)
          : await createCodeAction(input);
        setResult(outcome);
        if (outcome.ok && !id) {
          setValues(EMPTY);
          setCode("");
        }
      } catch {
        setResult({ ok: false, message: "Nu s-a putut salva. Încearcă din nou." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 text-sm text-taupe-700">
      <div className="grid gap-4 sm:grid-cols-2">
        {!id && (
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Codul (ce scrie clientul)</span>
            <input
              required
              value={code}
              maxLength={30}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="De exemplu LIVRARE0"
              className={`${inputClass} uppercase`}
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">Notă (doar pentru voi)</span>
          <input
            value={values.note}
            maxLength={200}
            onChange={(e) => set("note", e.target.value)}
            placeholder="De exemplu: pentru clienții din campania de Crăciun"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">Comandă minimă (lei)</span>
          <input
            inputMode="decimal"
            value={values.minSubtotal}
            onChange={(e) => set("minSubtotal", e.target.value)}
            placeholder="Gol = fără minim"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">Număr maxim de utilizări (în total)</span>
          <input
            inputMode="numeric"
            value={values.maxUses}
            onChange={(e) => set("maxUses", e.target.value.replace(/\D/g, ""))}
            placeholder="Gol = fără limită"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">Valabil de la (zi)</span>
          <input
            type="date"
            value={values.validFrom}
            onChange={(e) => set("validFrom", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">Valabil până la (zi, inclusiv)</span>
          <input
            type="date"
            value={values.validUntil}
            onChange={(e) => set("validUntil", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={values.removesCodFee}
          onChange={(e) => set("removesCodFee", e.target.checked)}
          className="mt-1"
        />
        <span>
          Scade și taxa de ramburs (pe lângă transport)
          <span className="block text-xs text-taupe-500">
            Dacă nu e bifat, clientul care alege ramburs plătește în continuare taxa de ramburs.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={values.oneUsePerCustomer}
          onChange={(e) => set("oneUsePerCustomer", e.target.checked)}
          className="mt-1"
        />
        <span>
          O singură folosire pe persoană
          <span className="block text-xs text-taupe-500">
            Se verifică numele, contul și adresa de livrare. A doua folosire e blocată, clientul
            primește mesaj, iar voi primiți email pe contact@ și office@.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 hover:bg-salamander-600 disabled:opacity-60"
        >
          {pending ? "Se salvează..." : id ? "Salvează" : "Creează codul"}
        </button>
        {result && (
          <span
            role={result.ok ? "status" : "alert"}
            className={result.ok ? "text-green-700" : "text-red-600"}
          >
            {result.message}
          </span>
        )}
      </div>
    </form>
  );
}

// On/off and delete for one code.
export function CodeRowButtons({
  id,
  isActive,
  canDelete,
}: {
  id: string;
  isActive: boolean;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<CodeOutcome>) {
    startTransition(async () => {
      try {
        const outcome = await action();
        setMessage(outcome.ok ? null : outcome.message);
      } catch {
        setMessage("Nu s-a putut salva.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setCodeActiveAction(id, !isActive))}
          className="rounded-full border border-taupe-400 px-3 py-1 text-xs font-medium text-taupe-700 hover:bg-cream-100 disabled:opacity-60"
        >
          {isActive ? "Oprește" : "Pornește"}
        </button>
        {canDelete && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Ștergi codul? Nu poate fi refăcut.")) {
                run(() => deleteCodeAction(id));
              }
            }}
            className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Șterge
          </button>
        )}
      </div>
      {message && <p className="max-w-56 text-xs text-red-600">{message}</p>}
    </div>
  );
}
