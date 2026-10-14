"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Turnstile, { CAPTCHA_ENABLED } from "@/components/security/Turnstile";
import PasswordRequirements from "@/components/account/PasswordRequirements";
import { isValidPassword } from "@/lib/validation/password";

export default function AccountRegisterPage() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaNonce, setCaptchaNonce] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, locale, captchaToken }),
    });

    if (res.ok) {
      router.push("/account");
      router.refresh();
      return;
    }

    const body = await res.json().catch(() => ({}));
    if (res.status === 429) setError(t("tooManyRequests"));
    else if (body.error === "email_taken") setError(t("emailTaken"));
    else if (body.error === "weak_password") setError(t("weakPassword"));
    else if (body.error === "captcha_failed") setError(t("captchaFailed"));
    else setError(t("genericError"));
    // a proof can be used once: ask for a fresh one
    setCaptchaToken("");
    setCaptchaNonce((n) => n + 1);
    setLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8">
        <h1 className="font-display text-2xl text-taupe-800">
          {t("registerTitle")}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field label={t("name")}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
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
              autoComplete="new-password"
              ref={(el) =>
                el?.setCustomValidity(
                  isValidPassword(password) ? "" : t("weakPassword"),
                )
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <PasswordRequirements password={password} />
          </Field>

          <Turnstile key={captchaNonce} onToken={setCaptchaToken} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || (CAPTCHA_ENABLED && !captchaToken)}
            className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
          >
            {loading ? t("registering") : t("register")}
          </button>
        </form>

        <p className="mt-5 text-sm text-taupe-600">
          {t("haveAccount")}{" "}
          <Link
            href="/account/login"
            className="text-salamander-600 hover:underline"
          >
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-taupe-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";
