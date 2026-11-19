"use client";

import { useEffect, useState } from "react";

// "Contactează": a small window with the ways to reach the customer: call, e-mail,
// WhatsApp, and copying the phone number or the e-mail address.
export default function ContactButton({
  name,
  phone,
  email,
  orderRef,
}: {
  name: string;
  // international form, for example +40712345678
  phone: string;
  email: string;
  // short order number, for the subject and the first line of the message
  orderRef: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"phone" | "email" | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function copy(kind: "phone" | "email", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("Copiază de aici:", value);
    }
  }

  // WhatsApp wants the number with the country code and no + sign
  const waNumber = phone.replace(/\D/g, "");
  const message = `Bună ziua! Vă scriu de la iDesignStudio.ro în legătură cu comanda #${orderRef}.`;
  const subject = `Comanda #${orderRef} - iDesignStudio.ro`;

  const row =
    "flex w-full items-center justify-between gap-3 rounded-lg border border-cream-200 px-4 py-3 text-left text-sm font-medium text-taupe-800 transition-colors hover:bg-cream-100";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-full border border-taupe-400 px-3 py-1 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100"
      >
        Contactează
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Contactează ${name}`}
            className="w-full max-w-sm rounded-2xl border-2 border-choc bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 rounded-t-xl bg-choc px-5 py-3 text-cream-50">
              <h2 className="font-display text-lg">Contactează clientul</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1 text-sm hover:bg-white/10"
                aria-label="Închide"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 p-5">
              <p className="mb-1 text-sm text-taupe-600">
                <span className="font-semibold text-taupe-800">{name}</span>
                <br />
                {phone} · {email}
              </p>
              <a href={`tel:${phone}`} className={row}>
                <span>Sună</span>
                <span className="text-xs font-normal text-taupe-500">{phone}</span>
              </a>
              <a
                href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}
                className={row}
              >
                <span>Scrie email</span>
                <span className="truncate text-xs font-normal text-taupe-500">
                  {email}
                </span>
              </a>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={row}
              >
                <span>Scrie pe WhatsApp</span>
                <span className="text-xs font-normal text-taupe-500">se deschide WhatsApp</span>
              </a>
              <button type="button" onClick={() => copy("phone", phone)} className={row}>
                <span>Copiază numărul de telefon</span>
                <span className="text-xs font-semibold text-green-700">
                  {copied === "phone" ? "Copiat ✓" : ""}
                </span>
              </button>
              <button type="button" onClick={() => copy("email", email)} className={row}>
                <span>Copiază adresa de email</span>
                <span className="text-xs font-semibold text-green-700">
                  {copied === "email" ? "Copiat ✓" : ""}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
