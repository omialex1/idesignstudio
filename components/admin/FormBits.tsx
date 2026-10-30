"use client";

import { useEffect, useRef, useState } from "react";

// Border / background for an input, red when it has an error.
export function controlClass(invalid?: boolean, extra = "") {
  return `rounded-lg border px-3 py-2 text-sm text-taupe-800 outline-none shadow-[inset_0_1px_2px_rgba(60,40,25,0.10)] transition-shadow focus:ring-2 ${
    invalid
      ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-200"
      : "border-taupe-400 bg-white focus:border-salamander-500 focus:ring-salamander-200"
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
    "Traducerea automată nu e încă activată: lipsește cheia Claude (ANTHROPIC_API_KEY) din setările site-ului.",
  invalid_key: "Cheia Claude nu este validă. Verific-o în setările site-ului.",
  quota: "Creditul contului Claude s-a epuizat sau limita de cereri a fost atinsă. Adaugă credit în console.anthropic.com sau încearcă peste un minut.",
  too_long: "Textul este prea lung pentru o singură traducere.",
  unauthorized: "Sesiunea a expirat. Conectează-te din nou.",
};

type TextControl = HTMLInputElement | HTMLTextAreaElement;

const AUTO_DELAY_MS = 1500;

// Fills the English fields from the Romanian ones (or the reverse) with Claude.
// While the person types, the other language follows by itself (only into a
// field that is empty or was filled by the translation, never over text written
// by hand). Nothing is saved: the person reads the result and saves as usual.
export function TranslateBar({ pairs }: { pairs: Pair[] }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"ro" | "en" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [autoOn, setAutoOn] = useState(true);
  const [auto, setAuto] = useState<{ ok: boolean; text: string } | null>(null);
  // fields whose current text came from a translation
  const filledByTranslation = useRef(new Set<string>());
  const pairsRef = useRef(pairs);
  useEffect(() => {
    pairsRef.current = pairs;
  });

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form || !autoOn) return;

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    let pending = 0;

    const control = (name: string) =>
      form.elements.namedItem(name) as TextControl | null;

    async function translateField(sourceName: string) {
      const found = pairsRef.current.find(
        ([ro, en]) => ro === sourceName || en === sourceName,
      );
      if (!found) return;
      const from = found[0] === sourceName ? "ro" : "en";
      const targetName = from === "ro" ? found[1] : found[0];
      const source = control(sourceName);
      const target = control(targetName);
      if (!source || !target) return;

      const text = source.value.trim();
      // text written by hand in the other language is left alone
      const targetIsMine =
        target.value.trim() === "" || filledByTranslation.current.has(targetName);
      if (!targetIsMine) return;
      if (text === "") {
        if (target.value !== "") {
          target.value = "";
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
        filledByTranslation.current.delete(targetName);
        return;
      }

      pending++;
      setMessage(null);
      setAuto({ ok: true, text: "Se traduce..." });
      try {
        const res = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, texts: [text] }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.translations)) {
          setAuto({
            ok: false,
            text:
              ERROR_MESSAGES[data?.error as string] ??
              "Traducerea automată nu a reușit acum.",
          });
          return;
        }
        // the person kept typing, or wrote the other side by hand: drop the result
        const stillMine =
          target.value.trim() === "" || filledByTranslation.current.has(targetName);
        if (source.value.trim() !== text || !stillMine) return;
        target.value = data.translations[0];
        filledByTranslation.current.add(targetName);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        setAuto({ ok: true, text: "Tradus automat. Verifică textul înainte să salvezi." });
      } catch {
        setAuto({ ok: false, text: "Nu am putut contacta serviciul de traducere." });
      } finally {
        pending--;
        if (pending === 0) {
          setAuto((current) =>
            current?.text === "Se traduce..." ? null : current,
          );
        }
      }
    }

    function onInput(e: Event) {
      // only what the person types; the values this code sets are ignored
      if (!e.isTrusted) return;
      const el = e.target as TextControl | null;
      const name = el?.name;
      if (!name) return;
      const found = pairsRef.current.find(([ro, en]) => ro === name || en === name);
      if (!found) return;
      // typing into a translated field makes it the person's own text
      filledByTranslation.current.delete(name);
      clearTimeout(timers.get(name));
      timers.set(
        name,
        setTimeout(() => translateField(name), AUTO_DELAY_MS),
      );
    }

    form.addEventListener("input", onInput);
    return () => {
      form.removeEventListener("input", onInput);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [autoOn]);

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
        filledByTranslation.current.add(job.target);
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
        Traducere automată (Claude)
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
      <label className="flex items-center gap-2 text-xs text-taupe-600">
        <input
          type="checkbox"
          checked={autoOn}
          onChange={(e) => {
            setAutoOn(e.target.checked);
            setAuto(null);
          }}
          className="h-4 w-4 accent-salamander-500"
        />
        Traduce automat în timp ce scrii (nu înlocuiește textul scris de tine)
      </label>
      {auto && !message && (
        <p
          role="status"
          className={`text-xs font-medium ${
            auto.ok ? "text-green-700" : "text-red-600"
          }`}
        >
          {auto.text}
        </p>
      )}
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
