"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

export default function AccountLoginPage() {
  const t = useTranslations("Account");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/account");
      router.refresh();
    } else {
      setError(t("invalidCredentials"));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8">
        <h1 className="font-display text-2xl text-taupe-800">
          {t("loginTitle")}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field label={t("email")}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t("password")}>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-terracotta-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-terracotta-600 disabled:opacity-60"
          >
            {loading ? t("loggingIn") : t("login")}
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-2 text-sm text-taupe-600">
          <Link
            href="/account/forgot-password"
            className="text-terracotta-600 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
          <p>
            {t("noAccount")}{" "}
            <Link
              href="/account/register"
              className="text-terracotta-600 hover:underline"
            >
              {t("registerLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-taupe-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-terracotta-400";
