"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    }).catch(() => null);
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-cream-300 bg-white p-8 shadow-sm">
        <p className="font-display text-xl text-taupe-800">
          iDesignStudio<span className="text-salamander-500">.ro</span>
        </p>
        <p className="mt-1 text-sm text-taupe-600">Resetare parolă admin</p>

        {sent ? (
          <p className="mt-6 text-sm text-taupe-600">
            Dacă există un cont cu acest nume sau această adresă, i-am trimis un
            link pentru alegerea unei parole noi, pe adresa lui de e-mail.
            Linkul este valabil 1 oră. Verifică și folderul Spam.
          </p>
        ) : (
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
                className="rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading || identifier.trim().length === 0}
              className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
            >
              {loading ? "Se trimite..." : "Trimite linkul de resetare"}
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
