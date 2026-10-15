"use client";

import { useState } from "react";
import Link from "next/link";

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, remember }),
    }).catch(() => null);

    if (res?.ok) {
      // a full page load, so the new login is used right away
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load on purpose (see above)
      window.location.assign("/admin");
      return;
    }
    setError(
      res?.status === 429
        ? "Prea multe încercări. Încearcă din nou peste câteva minute."
        : "Utilizator sau parolă incorectă.",
    );
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-cream-300 bg-white p-8 shadow-sm">
        <p className="font-display text-xl text-taupe-800">
          iDesignStudio<span className="text-salamander-500">.ro</span>
        </p>
        <p className="mt-1 text-sm text-taupe-600">Admin</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="identifier"
              className="text-sm font-medium text-taupe-700"
            >
              Utilizator sau e-mail
            </label>
            <input
              id="identifier"
              type="text"
              autoFocus
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-taupe-700"
            >
              Parolă
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-taupe-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-salamander-500"
            />
            Ține-mă conectat 30 de zile
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
          >
            {loading ? "Se conectează..." : "Conectare"}
          </button>
        </form>

        <p className="mt-5 text-sm">
          <Link
            href="/admin/forgot-password"
            className="text-salamander-600 hover:underline"
          >
            Am uitat parola
          </Link>
        </p>
      </div>
    </div>
  );
}
