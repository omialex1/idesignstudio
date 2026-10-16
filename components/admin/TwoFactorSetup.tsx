"use client";

import { useEffect, useRef, useState } from "react";
import BackupCodes from "@/components/admin/BackupCodes";

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

// First-time set-up of the authenticator app: scan the QR code (or type the
// key), prove it works with a code, then save the 20 backup codes.
export default function TwoFactorSetup({ username }: { username: string }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(
    null,
  );
  const [loadError, setLoadError] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/admin/2fa/start", { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error("start failed");
        setSetup(await res.json());
      })
      .catch(() => setLoadError(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);

    if (res?.ok) {
      const data = await res.json();
      setCodes(data.codes);
    } else {
      setError(
        res?.status === 429
          ? "Prea multe încercări. Încearcă din nou peste câteva minute."
          : "Cod incorect. Verifică ora telefonului și încearcă cu codul nou afișat.",
      );
    }
    setLoading(false);
  }

  if (codes) {
    return (
      <BackupCodes
        codes={codes}
        username={username}
        doneLabel="Intră în admin"
        onDone={() => {
          // a full page load, so the new state is used right away
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load on purpose (see above)
          window.location.assign("/admin");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-taupe-700">
        <li>
          Instalează pe telefon o aplicație de autentificare (Google
          Authenticator, Microsoft Authenticator sau Authy).
        </li>
        <li>Scanează codul QR de mai jos (sau scrie cheia manual).</li>
        <li>Scrie aici codul de 6 cifre pe care îl arată aplicația.</li>
      </ol>

      {loadError && (
        <p className="text-sm text-red-600">
          Nu am putut pregăti codul QR. Reîncarcă pagina.
        </p>
      )}
      {!setup && !loadError && (
        <p className="text-sm text-taupe-500">Se pregătește...</p>
      )}
      {setup && (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not a site image */}
          <img
            src={setup.qr}
            alt="Cod QR pentru aplicația de autentificare"
            width={220}
            height={220}
          />
          <p className="text-xs text-taupe-500">Sau scrie cheia manual:</p>
          <code className="break-all rounded bg-cream-50 px-2 py-1 text-xs text-taupe-800">
            {setup.secret.replace(/(.{4})/g, "$1 ").trim()}
          </code>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="text-sm font-medium text-taupe-700">
            Cod de 6 cifre
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !setup || code.replace(/\s/g, "").length !== 6}
          className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
        >
          {loading ? "Se verifică..." : "Activează"}
        </button>
      </form>
    </div>
  );
}
