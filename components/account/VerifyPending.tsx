"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

// "Check your e-mail" screen shown after creating an account (or after trying
// to log in to an unconfirmed one). It watches for the confirmation: when the
// link is opened anywhere (mail app, another window) this window is logged in
// by itself and moves on to the account.
export default function VerifyPending({
  email,
  reminder = false,
}: {
  email: string;
  // true when the person came from a login attempt on an unconfirmed account
  reminder?: boolean;
}) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/account/pending-status", {
          cache: "no-store",
        });
        const data = await res.json();
        if (alive && data.status === "verified") {
          router.push("/account");
          router.refresh();
        }
      } catch {
        // try again at the next check
      }
    }
    const timer = setInterval(check, 3000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [router]);

  async function resend() {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/resend-verification", {
        method: "POST",
      });
      if (res.ok) {
        setMessage({ text: t("verificationSent"), error: false });
      } else if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setMessage({
          text:
            body.error === "too_many_requests"
              ? t("tooManyRequests")
              : t("verificationTooSoon"),
          error: true,
        });
      } else {
        setMessage({ text: t("genericError"), error: true });
      }
    } catch {
      setMessage({ text: t("genericError"), error: true });
    }
    setSending(false);
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-taupe-800">
        {t("verifyPendingTitle")}
      </h1>
      {reminder && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("verifyPendingReminder")}
        </p>
      )}
      <p className="mt-3 text-sm text-taupe-700">
        {t("verifyPendingBody", { email })}
      </p>
      <p className="mt-2 text-xs text-taupe-500">{t("verifyPendingAuto")}</p>

      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="mt-5 rounded-full border border-taupe-500 px-5 py-2 text-sm font-semibold text-taupe-700 transition-colors hover:bg-taupe-500 hover:text-cream-50 disabled:opacity-60"
      >
        {sending ? t("resendingVerification") : t("resendVerification")}
      </button>
      {message && (
        <p
          role="status"
          className={`mt-2 text-sm ${message.error ? "text-red-600" : "text-green-700"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
