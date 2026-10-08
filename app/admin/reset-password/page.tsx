"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const MIN_LENGTH = 12;

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
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
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);

    if (res?.ok) {
      setDone(true);
    } else {
      const data = await res?.json().catch(() => null);
      setError(
        data?.error === "invalid_token"
          ? "Linkul este invalid sau a expirat. Cere unul nou."
          : "Nu am putut schimba parola. Încearcă din nou.",
      );
    }
    setLoading(false);
  }

  const inputClass =
    "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8 shadow-sm">
        <p className="font-display text-xl text-taupe-800">
          iDesignStudio<span className="text-salamander-500">.ro</span>
        </p>
        <p className="mt-1 text-sm text-taupe-600">Parolă nouă admin</p>

        {done ? (
          <p className="mt-6 text-sm text-taupe-600">
            Parola a fost schimbată. Te poți conecta acum cu parola nouă.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-taupe-700"
              >
                Parolă nouă (minimum {MIN_LENGTH} caractere)
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
        )}

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
