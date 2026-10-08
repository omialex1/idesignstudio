"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart/store";
import { formatPrice } from "@/lib/format";
import { COD_FEE_CENTS, calculateShippingCents } from "@/lib/shipping";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine: "",
  city: "",
  county: "",
  postalCode: "",
  notes: "",
  companyName: "",
  companyCui: "",
};

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const tLegal = useTranslations("Legal");
  const locale = useLocale();
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const items = useCartStore((s) => s.items);

  const [form, setForm] = useState(emptyForm);
  const [isCompany, setIsCompany] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod">("card");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (!hasHydrated) {
    return <div className="flex flex-1" />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-3xl text-taupe-800">{t("title")}</h1>
        <p className="text-taupe-600">{t("emptyCart")}</p>
        <Link
          href="/"
          className="text-sm font-medium text-salamander-600 hover:underline"
        >
          {t("continueShopping")}
        </Link>
      </div>
    );
  }

  const currency = items[0].currency;
  const subtotal = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );
  const shipping = calculateShippingCents(subtotal);
  const codFee = paymentMethod === "cod" ? COD_FEE_CENTS : 0;
  const total = subtotal + shipping + codFee;

  const errorMessages: Record<string, string> = {
    out_of_stock: t("errorOutOfStock"),
    unavailable: t("errorUnavailable"),
    payment_unavailable: t("errorPayment"),
    invalid_company: t("errorCompany"),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          termsAccepted,
          paymentMethod,
          customer: { ...form, isCompany },
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && (data?.paymentUrl || data?.redirectUrl)) {
        window.location.href = data.paymentUrl ?? data.redirectUrl;
        return;
      }
      setError(errorMessages[data?.error] ?? t("errorGeneric"));
    } catch {
      setError(t("errorGeneric"));
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="font-display text-3xl text-taupe-800">{t("title")}</h1>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]"
        >
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
              <h2 className="font-display text-xl text-taupe-800">
                {t("contactHeading")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("firstName")}>
                  <input
                    required
                    maxLength={80}
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("lastName")}>
                  <input
                    required
                    maxLength={80}
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("email")}>
                  <input
                    required
                    type="email"
                    maxLength={200}
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("phone")}>
                  <input
                    required
                    type="tel"
                    maxLength={30}
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <button
                type="button"
                aria-pressed={isCompany}
                onClick={() => setIsCompany((value) => !value)}
                className="w-fit rounded-full border border-cream-300 bg-cream-200 px-5 py-2 text-sm font-semibold text-taupe-800 transition-colors hover:bg-cream-300"
              >
                {isCompany ? t("companyToggleOff") : t("companyToggleOn")}
              </button>

              {isCompany && (
                <div className="flex flex-col gap-4 rounded-xl border border-cream-200 bg-cream-50 p-4">
                  <h3 className="font-display text-lg text-taupe-800">
                    {t("companyHeading")}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("companyName")}>
                      <input
                        required
                        maxLength={150}
                        autoComplete="organization"
                        value={form.companyName}
                        onChange={(e) => update("companyName", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label={t("companyCui")}>
                      <input
                        required
                        maxLength={20}
                        value={form.companyCui}
                        onChange={(e) => update("companyCui", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
              <h2 className="font-display text-xl text-taupe-800">
                {t("deliveryHeading")}
              </h2>
              <Field label={t("addressLine")}>
                <input
                  required
                  maxLength={200}
                  autoComplete="street-address"
                  value={form.addressLine}
                  onChange={(e) => update("addressLine", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t("city")}>
                  <input
                    required
                    maxLength={100}
                    autoComplete="address-level2"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("county")}>
                  <input
                    required
                    maxLength={100}
                    autoComplete="address-level1"
                    value={form.county}
                    onChange={(e) => update("county", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("postalCode")}>
                  <input
                    required
                    maxLength={12}
                    autoComplete="postal-code"
                    value={form.postalCode}
                    onChange={(e) => update("postalCode", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label={t("notes")}>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-cream-200 bg-white p-6">
              <h2 className="font-display text-xl text-taupe-800">
                {t("paymentHeading")}
              </h2>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-200 p-4 text-sm text-taupe-700">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{t("payCard")}</span>
                  <span className="block text-xs text-taupe-500">
                    {t("payCardNote")}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-200 p-4 text-sm text-taupe-700">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">
                    {t("payCod")} (+{formatPrice(COD_FEE_CENTS, currency, locale)})
                  </span>
                  <span className="block text-xs text-taupe-500">
                    {t("payCodNote")}
                  </span>
                </span>
              </label>
            </section>
          </div>

          <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-cream-200 bg-white p-6">
            <h2 className="font-display text-xl text-taupe-800">
              {t("summaryHeading")}
            </h2>
            <ul className="flex flex-col gap-2 text-sm text-taupe-600">
              {items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3">
                  <span>
                    {item.nameSnapshot} &times; {item.quantity}
                  </span>
                  <span className="whitespace-nowrap">
                    {formatPrice(
                      item.priceCents * item.quantity,
                      item.currency,
                      locale,
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 border-t border-cream-200 pt-3 text-sm text-taupe-600">
              <div className="flex justify-between">
                <span>{t("subtotal")}</span>
                <span>{formatPrice(subtotal, currency, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("shipping")}</span>
                <span>
                  {shipping === 0
                    ? t("shippingFree")
                    : formatPrice(shipping, currency, locale)}
                </span>
              </div>
              {codFee > 0 && (
                <div className="flex justify-between">
                  <span>{t("codFee")}</span>
                  <span>{formatPrice(codFee, currency, locale)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between text-base font-semibold text-taupe-800">
                <span>{t("total")}</span>
                <span>{formatPrice(total, currency, locale)}</span>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-taupe-600">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1"
              />
              <span>
                {t("acceptPrefix")}{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-salamander-600 hover:underline"
                >
                  {tLegal("termsLink")}
                </Link>{" "}
                {t("and")}{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-salamander-600 hover:underline"
                >
                  {tLegal("privacyLink")}
                </Link>
                .
              </span>
            </label>

            {error && <p className="text-sm text-salamander-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-salamander-500 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-tangerine-400 disabled:opacity-60"
            >
              {submitting
                ? t("redirecting")
                : paymentMethod === "cod"
                  ? t("placeOrderCod")
                  : t("payButton")}
            </button>
            {paymentMethod === "card" && (
              <p className="text-xs text-taupe-400">{t("secureNote")}</p>
            )}
            <Link
              href="/cart"
              className="text-sm text-salamander-600 hover:underline"
            >
              {t("backToCart")}
            </Link>
          </aside>
        </form>
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
