"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ChangePasswordForm() {
  const t = useTranslations("Account");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setMessage({ text: t("passwordChanged"), error: false });
      } else if (body.error === "wrong_password") {
        setMessage({ text: t("wrongPassword"), error: true });
      } else if (body.error === "weak_password") {
        setMessage({ text: t("weakPassword"), error: true });
      } else {
        setMessage({ text: t("genericError"), error: true });
      }
    } catch {
      setMessage({ text: t("genericError"), error: true });
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-taupe-700">
          {t("currentPassword")}
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-taupe-700">{t("newPassword")}</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400"
        />
      </label>
      {message && (
        <p
          role="status"
          className={`text-sm ${message.error ? "text-red-600" : "text-green-700"}`}
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded-full border border-taupe-500 px-6 py-2 text-sm font-semibold text-taupe-700 transition-colors hover:bg-taupe-500 hover:text-cream-50 disabled:opacity-60"
      >
        {loading ? t("changingPassword") : t("changePassword")}
      </button>
    </form>
  );
}
