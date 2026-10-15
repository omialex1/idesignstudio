"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type State =
  | { status: "working" }
  // loggedIn: the browser that opened the link is now logged in
  | { status: "done"; linked: number; loggedIn: boolean; email: string }
  | { status: "invalid" };

function VerifyEmail() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>(
    token ? { status: "working" } : { status: "invalid" },
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch("/api/account/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok && body.loggedIn) {
          // same browser that created the account: straight into the account
          setTimeout(() => {
            // a full page load, so no earlier answer kept by the router is reused
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load on purpose (see above)
            window.location.assign(`/${locale}/account`);
          }, 900);
        }
        setState(
          res.ok
            ? {
                status: "done",
                linked: Number(body.linkedOrders) || 0,
                loggedIn: Boolean(body.loggedIn),
                email: String(body.email ?? ""),
              }
            : { status: "invalid" },
        );
      })
      .catch(() => {
        if (active) setState({ status: "invalid" });
      });
    return () => {
      active = false;
    };
  }, [token, locale]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8 text-center">
        <h1 className="font-display text-2xl text-taupe-800">
          {t("verifyEmailTitle")}
        </h1>
        {state.status === "working" && (
          <p className="mt-4 text-sm text-taupe-600">{t("verifyingEmail")}</p>
        )}
        {state.status === "done" && (
          <>
            <p className="mt-4 text-sm text-green-700">
              {state.loggedIn
                ? t("verifyEmailLoggingIn")
                : t("verifyEmailDone")}
            </p>
            {state.linked > 0 && (
              <p className="mt-2 text-sm text-taupe-600">
                {t("verifyEmailLinked", { count: state.linked })}
              </p>
            )}
            {state.loggedIn ? (
              <Link
                href="/account"
                className="mt-6 inline-block rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
              >
                {t("goToAccount")}
              </Link>
            ) : (
              <>
                <p className="mt-2 text-sm text-taupe-600">
                  {t("verifyEmailLoginHint")}
                </p>
                <Link
                  href={`/account/login?confirmed=1&email=${encodeURIComponent(state.email)}`}
                  className="mt-6 inline-block rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
                >
                  {t("login")}
                </Link>
                <p className="mt-4 text-xs text-taupe-500">
                  {t("verifyEmailCloseHint")}
                </p>
              </>
            )}
          </>
        )}
        {state.status === "invalid" && (
          <>
            <p className="mt-4 text-sm text-red-600">
              {t("verifyEmailInvalid")}
            </p>
            <Link
              href="/account/login"
              className="mt-6 inline-block text-sm font-medium text-salamander-600 hover:underline"
            >
              {t("loginLink")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
