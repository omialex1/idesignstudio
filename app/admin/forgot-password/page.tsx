"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    await fetch("/api/admin/forgot-password", { method: "POST" }).catch(
      () => null,
    );
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8 shadow-sm">
        <p className="font-display text-xl text-taupe-800">
          iDesignStudio<span className="text-salamander-500">.ro</span>
        </p>
        <p className="mt-1 text-sm text-taupe-600">Resetare parolă admin</p>

        {sent ? (
          <p className="mt-6 text-sm text-taupe-600">
            Dacă adresa de email a administratorului este configurată, i-am
            trimis un link pentru alegerea unei parole noi. Linkul este valabil
            1 oră. Verifică și folderul Spam.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-taupe-600">
              Îți trimitem un link de resetare pe adresa de email a
              administratorului.
            </p>
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
            >
              {loading ? "Se trimite..." : "Trimite linkul de resetare"}
            </button>
          </div>
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
