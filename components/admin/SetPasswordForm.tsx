"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const MIN_LENGTH = 12;

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

// The page opened from an e-mailed link: choosing a first password (invitation)
// or a new one (reset). When it works the person is logged in and goes on to
// the admin.
export default function SetPasswordForm({ kind }: { kind: "invite" | "reset" }) {
  return (
    <Suspense fallback={null}>
      <Form kind={kind} />
    </Suspense>
  );
}

function Form({ kind }: { kind: "invite" | "reset" }) {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Parola trebuie să aibă cel puțin ${MIN_LENGTH} caractere.`);
      return;
    }
    if (password !== confirm) {
      setError("Cele două parole nu coincid.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, kind }),
    }).catch(() => null);

    const data = await res?.json().catch(() => null);
    if (res?.ok) {
      // a full page load, so the freshly set login is used right away; with
      // two-step login set up the person still has to log in with a code
      window.location.assign(data?.needsLogin ? "/admin/login" : "/admin");
      return;
    }
    setError(
      res?.status === 429
        ? "Prea multe încercări. Încearcă din nou peste puțin timp."
        : data?.error === "invalid_token"
          ? "Linkul este invalid, a expirat sau a fost deja folosit. Cere unul nou."
          : "Nu am putut salva parola. Încearcă din nou.",
    );
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-cream-300 bg-white p-8 shadow-sm">
        <p className="font-display text-xl text-taupe-800">
          iDesignStudio<span className="text-salamander-500">.ro</span>
        </p>
        <p className="mt-1 text-sm text-taupe-600">
          {kind === "invite" ? "Alege-ți parola" : "Parolă nouă admin"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-taupe-700"
            >
              Parolă (minimum {MIN_LENGTH} caractere)
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm"
              className="text-sm font-medium text-taupe-700"
            >
              Repetă parola
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !token}
            className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
          >
            {loading ? "Se salvează..." : "Salvează parola"}
          </button>
        </form>

        <p className="mt-5 text-sm">
          <Link
            href="/admin/login"
            className="text-salamander-600 hover:underline"
          >
            Înapoi la conectare
          </Link>
        </p>
      </div>
    </div>
  );
}
