"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LoggedInGate from "@/components/account/LoggedInGate";
import VerifyPending from "@/components/account/VerifyPending";

export default function AccountLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const params = useSearchParams();
  // the confirmation page sends people here with their address filled in
  const [email, setEmail] = useState(params.get("email") ?? "");
  const confirmed = params.get("confirmed") === "1";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // set when the password is right but the e-mail was never confirmed
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

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
      // a full page load: the router must not reuse the redirect-to-login answer
      // it may have kept from before the login
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load on purpose (see above)
      window.location.assign(`/${locale}/account`);
      return;
    }

    const body = await res.json().catch(() => ({}));
    if (body.error === "email_not_verified") {
      setUnconfirmedEmail(body.email ?? email);
    } else {
      setError(
        res.status === 429 ? t("tooManyRequests") : t("invalidCredentials"),
      );
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8">
        <LoggedInGate>
          {unconfirmedEmail ? (
            <VerifyPending email={unconfirmedEmail} reminder />
          ) : (
            <>
              <h1 className="font-display text-2xl text-taupe-800">
                {t("loginTitle")}
              </h1>

              {confirmed && (
                <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                  {t("loginConfirmedNote")}
                </p>
              )}

              <form
                onSubmit={handleSubmit}
                className="mt-6 flex flex-col gap-4"
              >
                <Field label={t("email")}>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("password")}>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    autoFocus={confirmed}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
                >
                  {loading ? t("loggingIn") : t("login")}
                </button>
              </form>

              <div className="mt-5 flex flex-col gap-2 text-sm text-taupe-600">
                <Link
                  href="/account/forgot-password"
                  className="text-salamander-600 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
                <p>
                  {t("noAccount")}{" "}
                  <Link
                    href="/account/register"
                    className="text-salamander-600 hover:underline"
                  >
                    {t("registerLink")}
                  </Link>
                </p>
              </div>
            </>
          )}
        </LoggedInGate>
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
