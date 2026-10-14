"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Shown on the account page until the e-mail address is confirmed.
export default function VerifyEmailBanner() {
  const t = useTranslations("Account");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

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
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-display text-lg text-taupe-800">
        {t("verifyBannerTitle")}
      </h2>
      <p className="mt-1 text-sm text-taupe-700">{t("verifyBannerBody")}</p>
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="mt-3 rounded-full border border-taupe-500 px-5 py-2 text-sm font-semibold text-taupe-700 transition-colors hover:bg-taupe-500 hover:text-cream-50 disabled:opacity-60"
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
