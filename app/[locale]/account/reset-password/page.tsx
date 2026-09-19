"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useTranslations("Account");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/account/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/account/login"), 2000);
    } else {
      const body = await res.json().catch(() => ({}));
      if (body.error === "weak_password") setError(t("weakPassword"));
      else setError(t("invalidOrExpiredToken"));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8">
        <h1 className="font-display text-2xl text-brown-800">
          {t("resetPasswordTitle")}
        </h1>

        {success ? (
          <p className="mt-4 text-sm text-green-700">
            {t("passwordResetSuccess")}
          </p>
        ) : !token ? (
          <p className="mt-4 text-sm text-red-600">
            {t("invalidOrExpiredToken")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-brown-700">
                {t("newPassword")}
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-cream-200 px-3 py-2 text-sm text-brown-800 outline-none focus:border-terracotta-400"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-terracotta-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-terracotta-600 disabled:opacity-60"
            >
              {t("resetPasswordButton")}
            </button>
          </form>
        )}

        <p className="mt-5 text-sm">
          <Link
            href="/account/login"
            className="text-terracotta-600 hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
