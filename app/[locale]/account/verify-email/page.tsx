"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type State =
  | { status: "working" }
  | { status: "done"; linked: number }
  | { status: "invalid" };

function VerifyEmail() {
  const t = useTranslations("Account");
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
        setState(
          res.ok
            ? { status: "done", linked: Number(body.linkedOrders) || 0 }
            : { status: "invalid" },
        );
      })
      .catch(() => {
        if (active) setState({ status: "invalid" });
      });
    return () => {
      active = false;
    };
  }, [token]);

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
              {t("verifyEmailDone")}
            </p>
            <p className="mt-2 text-sm text-taupe-600">
              {t("verifyEmailCloseHint")}
            </p>
            {state.linked > 0 && (
              <p className="mt-2 text-sm text-taupe-600">
                {t("verifyEmailLinked", { count: state.linked })}
              </p>
            )}
            <Link
              href="/account"
              className="mt-6 inline-block rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
            >
              {t("dashboardTitle")}
            </Link>
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
