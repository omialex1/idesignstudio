"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RO_COUNTIES } from "@/lib/geo/ro-counties";
import { POSTAL_CODE_PATTERN, normalizePhone } from "@/lib/validation/phone";
import LocalityField from "@/components/address/LocalityField";

type Defaults = {
  name: string;
  phone: string;
  county: string;
  city: string;
  addressLine: string;
  postalCode: string;
};

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

// Name, phone and delivery address saved on the account. They fill in the
// checkout for the customer.
export default function ProfileForm({ defaults }: { defaults: Defaults }) {
  const t = useTranslations("Account");
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  function update(field: keyof Defaults, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }

  const phoneInvalid = form.phone.trim() !== "" && !normalizePhone(form.phone);
  const postalInvalid =
    form.postalCode !== "" && !POSTAL_CODE_PATTERN.test(form.postalCode);

  const errors: Record<string, string> = {
    invalid_phone: t("errorPhone"),
    invalid_postal_code: t("errorPostalCode"),
    ambiguous_locality: t("errorAmbiguousLocality"),
    incomplete_address: t("errorIncompleteAddress"),
    missing_name: t("errorMissingName"),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        // the server writes the official spelling of county and locality
        setForm((prev) => ({
          ...prev,
          city: body.city ?? prev.city,
          county: body.county ?? prev.county,
          phone: body.phone ?? prev.phone,
        }));
        setMessage({
          text: body.unverified
            ? t("profileSavedUnverified")
            : t("profileSaved"),
          error: false,
        });
      } else {
        setMessage({
          text: errors[body.error] ?? t("genericError"),
          error: true,
        });
      }
    } catch {
      setMessage({ text: t("genericError"), error: true });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-taupe-700">{t("name")}</span>
        <input
          required
          maxLength={120}
          autoComplete="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-taupe-700">{t("phone")}</span>
        <input
          type="tel"
          inputMode="tel"
          maxLength={30}
          autoComplete="tel"
          value={form.phone}
          ref={(el) =>
            el?.setCustomValidity(phoneInvalid ? t("errorPhone") : "")
          }
          onChange={(e) => update("phone", e.target.value)}
          className={inputClass}
        />
        {phoneInvalid && (
          <span className="text-xs text-red-600">{t("errorPhone")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-taupe-700">{t("county")}</span>
        <select
          autoComplete="address-level1"
          value={form.county}
          onChange={(e) => {
            update("county", e.target.value);
            update("city", "");
          }}
          className={inputClass}
        >
          <option value="">{t("selectCounty")}</option>
          {RO_COUNTIES.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </select>
      </label>

      <LocalityField
        county={form.county}
        value={form.city}
        onChange={(v) => update("city", v)}
        label={t("locality")}
        required={false}
        inputClassName={inputClass}
      />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-taupe-700">{t("addressLine")}</span>
        <input
          maxLength={200}
          autoComplete="street-address"
          value={form.addressLine}
          onChange={(e) => update("addressLine", e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-taupe-700">{t("postalCode")}</span>
        <input
          inputMode="numeric"
          maxLength={6}
          autoComplete="postal-code"
          value={form.postalCode}
          ref={(el) =>
            el?.setCustomValidity(postalInvalid ? t("errorPostalCode") : "")
          }
          onChange={(e) =>
            update("postalCode", e.target.value.replace(/\D/g, ""))
          }
          className={inputClass}
        />
        {postalInvalid && (
          <span className="text-xs text-red-600">{t("errorPostalCode")}</span>
        )}
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
        disabled={saving}
        className="w-fit rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
      >
        {saving ? t("savingProfile") : t("saveProfile")}
      </button>
    </form>
  );
}
