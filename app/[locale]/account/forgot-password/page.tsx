"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function ForgotPasswordPage() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/account/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8">
        <h1 className="font-display text-2xl text-taupe-800">
          {t("forgotPasswordTitle")}
        </h1>

        {sent ? (
          <p className="mt-4 text-sm text-taupe-600">{t("resetLinkSent")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-taupe-700">{t("email")}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-terracotta-400"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-terracotta-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-terracotta-600 disabled:opacity-60"
            >
              {t("sendResetLink")}
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
