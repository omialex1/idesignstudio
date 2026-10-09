"use client";

import { useRef, useState } from "react";

// Border / background for an input, red when it has an error.
export function controlClass(invalid?: boolean, extra = "") {
  return `rounded-lg border px-3 py-2 text-sm text-taupe-800 outline-none ${
    invalid
      ? "border-red-500 bg-red-50 focus:border-red-600"
      : "border-cream-200 focus:border-salamander-400"
  } ${extra}`;
}

// Label + control + hint, with a red marker and message when the field is
// required / has an error.
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-taupe-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600" title="Câmp obligatoriu">
            *
          </span>
        )}
      </span>
      {children}
      {error ? (
        <FieldError message={error} />
      ) : (
        hint && <span className="text-xs text-taupe-400">{hint}</span>
      )}
    </label>
  );
}

export function FieldError({ message }: { message: string }) {
  return (
    <span
      role="alert"
      className="flex items-start gap-1.5 text-xs font-medium text-red-600"
    >
      <span
        aria-hidden="true"
        className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white"
      >
        !
      </span>
      {message}
    </span>
  );
}

type Pair = [roField: string, enField: string];

const ERROR_MESSAGES: Record<string, string> = {
  not_configured:
    "Traducerea automată nu e încă activată: lipsește cheia DeepL din setările site-ului.",
  invalid_key: "Cheia DeepL nu este validă. Verific-o în setările site-ului.",
  quota: "Limita lunară gratuită DeepL a fost atinsă. Încearcă luna viitoare.",
  too_long: "Textul este prea lung pentru o singură traducere.",
  unauthorized: "Sesiunea a expirat. Conectează-te din nou.",
};

// Fills the English fields from the Romanian ones (or the reverse) with DeepL.
// Nothing is saved: the person reads the result and saves the form as usual.
export function TranslateBar({ pairs }: { pairs: Pair[] }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"ro" | "en" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function run(from: "ro" | "en") {
    const form = anchor.current?.closest("form");
    if (!form) return;

    const read = (name: string) =>
      (
        form.elements.namedItem(name) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | null
      )?.value.trim() ?? "";

    const jobs = pairs
      .map(([ro, en]) => ({
        source: from === "ro" ? ro : en,
        target: from === "ro" ? en : ro,
      }))
      .filter((job) => read(job.source) !== "");

    if (jobs.length === 0) {
      setMessage({
        ok: false,
        text:
          from === "ro"
            ? "Nu e nimic de tradus: completează întâi câmpurile în română."
            : "Nu e nimic de tradus: completează întâi câmpurile în engleză.",
      });
      return;
    }

    const overwrites = jobs.some((job) => read(job.target) !== "");
    if (
      overwrites &&
      !window.confirm(
        `Câmpurile ${from === "ro" ? "în engleză" : "în română"} deja completate vor fi înlocuite cu traducerea. Continui?`,
      )
    ) {
      return;
    }

    setBusy(from);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, texts: jobs.map((j) => read(j.source)) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.translations)) {
        setMessage({
          ok: false,
          text:
            ERROR_MESSAGES[data?.error as string] ??
            "Traducerea nu a reușit acum. Încearcă din nou.",
        });
        return;
      }

      jobs.forEach((job, i) => {
        const el = form.elements.namedItem(job.target) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | null;
        if (!el) return;
        // Uncontrolled input: set the value and let the form see an "input".
        el.value = data.translations[i];
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      setMessage({
        ok: true,
        text: "Gata. Citește textul tradus, corectează dacă e cazul, apoi apasă Salvează.",
      });
    } catch {
      setMessage({
        ok: false,
        text: "Nu am putut contacta serviciul de traducere. Încearcă din nou.",
      });
    } finally {
      setBusy(null);
    }
  }

  const button =
    "rounded-full border border-cream-300 bg-cream-100 px-4 py-2 text-sm font-semibold text-taupe-800 transition-colors hover:bg-cream-200 disabled:cursor-wait disabled:opacity-60";

  return (
    <div
      ref={anchor}
      className="flex flex-col gap-2 rounded-xl border border-cream-200 bg-cream-50 p-4"
    >
      <p className="text-sm font-medium text-taupe-700">
        Traducere automată (DeepL)
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("ro")}
          className={button}
        >
          {busy === "ro" ? "Se traduce..." : "Română → Engleză"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("en")}
          className={button}
        >
          {busy === "en" ? "Se traduce..." : "Engleză → Română"}
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`text-xs font-medium ${
            message.ok ? "text-green-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
