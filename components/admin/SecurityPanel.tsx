"use client";

import AdminCard from "@/components/admin/AdminCard";
import { useState } from "react";
import BackupCodes from "@/components/admin/BackupCodes";

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";

export default function SecurityPanel({
  username,
  remaining,
}: {
  username: string;
  remaining: number;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [left, setLeft] = useState(remaining);

  async function regenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/2fa/backup-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setCodes(data.codes);
      setLeft(data.codes.length);
      setCode("");
    } else {
      setError(
        res?.status === 429
          ? "Prea multe încercări. Încearcă din nou peste câteva minute."
          : "Cod incorect.",
      );
    }
    setLoading(false);
  }

  return (
    <AdminCard title="Coduri de rezervă">
      {codes ? (
        <div className="mt-4">
          <BackupCodes
            codes={codes}
            username={username}
            doneLabel="Gata"
            onDone={() => setCodes(null)}
          />
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-taupe-600">
            Ți-au mai rămas{" "}
            <strong className={left <= 5 ? "text-red-600" : undefined}>
              {left}
            </strong>{" "}
            din 20 de coduri de rezervă.
            {left <= 5 && " Generează un set nou curând."}
          </p>
          <form onSubmit={regenerate} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-taupe-700">
              Cod curent din aplicație (pentru confirmare)
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={loading || code.replace(/\s/g, "").length !== 6}
              className="rounded-full border border-taupe-500 px-5 py-2 text-sm font-semibold text-taupe-700 transition-colors hover:bg-taupe-500 hover:text-cream-50 disabled:opacity-60"
            >
              {loading ? "Se generează..." : "Generează un set nou de 20"}
            </button>
          </form>
          <p className="mt-2 text-xs text-taupe-500">
            Un set nou le anulează pe cele vechi.
          </p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}
    </AdminCard>
  );
}
