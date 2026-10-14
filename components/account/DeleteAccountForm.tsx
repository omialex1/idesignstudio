"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function DeleteAccountForm() {
  const t = useTranslations("Account");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(t("deleteAccountConfirm"))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      setError(
        body.error === "wrong_password"
          ? t("wrongPassword")
          : t("genericError"),
      );
    } catch {
      setError(t("genericError"));
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-taupe-700">
          {t("confirmWithPassword")}
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-red-400"
        />
      </label>
      {error && (
        <p role="status" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded-full border border-red-300 px-6 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
      >
        {loading ? t("deletingAccount") : t("deleteAccount")}
      </button>
    </form>
  );
}
