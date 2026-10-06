"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function WithdrawalPage() {
  const t = useTranslations("Withdrawal");
  const locale = useLocale();
  const [form, setForm] = useState({
    name: "",
    email: "",
    orderNumber: "",
    products: "",
    message: "",
    website: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl text-taupe-800">
            {t("title")}
          </h1>
          <p className="mt-3 text-taupe-600">{t("intro")}</p>
        </div>

        {status === "sent" ? (
          <div className="rounded-2xl border border-cream-200 bg-white p-6">
            <h2 className="font-display text-xl text-taupe-800">
              {t("successTitle")}
            </h2>
            <p className="mt-2 text-taupe-600">{t("successBody")}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6"
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-taupe-700">{t("name")}</span>
              <input
                type="text"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-taupe-700">{t("email")}</span>
              <input
                type="email"
                required
                maxLength={200}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-taupe-700">
                {t("orderNumber")}
              </span>
              <input
                type="text"
                required
                maxLength={60}
                value={form.orderNumber}
                onChange={(e) => update("orderNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-taupe-700">
                {t("products")}
              </span>
              <textarea
                required
                rows={3}
                maxLength={1000}
                value={form.products}
                onChange={(e) => update("products", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-taupe-700">
                {t("message")}
              </span>
              <textarea
                rows={3}
                maxLength={2000}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                className={inputClass}
              />
            </label>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className="hidden"
            />

            {status === "error" && (
              <p className="text-sm text-salamander-600">{t("error")}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-tangerine-400 disabled:opacity-60"
            >
              {status === "sending" ? t("sending") : t("submit")}
            </button>
          </form>
        )}

        <p className="text-sm">
          <Link href="/terms" className="text-salamander-600 hover:underline">
            {t("backToTerms")}
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";
