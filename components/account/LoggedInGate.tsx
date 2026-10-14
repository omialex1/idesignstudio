"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Wraps the login and sign-up forms. If someone is already logged in on this
// browser, it says so and offers to go to the account or to log out and
// continue, instead of leaving the person wondering why nothing works.
export default function LoggedInGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("Account");
  const [me, setMe] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/account/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (alive && data.loggedIn) {
          setMe({ name: data.name, email: data.email });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" });
    setMe(null);
  }

  if (!me) return <>{children}</>;

  return (
    <div>
      <h1 className="font-display text-2xl text-taupe-800">
        {t("alreadyLoggedInTitle")}
      </h1>
      <p className="mt-3 text-sm text-taupe-600">
        {t("alreadyLoggedInBody", { name: me.name, email: me.email })}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/account"
          className="rounded-full bg-salamander-500 px-6 py-2.5 text-center text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600"
        >
          {t("goToAccount")}
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-taupe-500 px-6 py-2.5 text-sm font-semibold text-taupe-700 transition-colors hover:bg-taupe-500 hover:text-cream-50"
        >
          {t("logoutAndContinue")}
        </button>
      </div>
    </div>
  );
}
