"use client";

import { useState } from "react";

// The 20 backup codes, shown once. They can be copied, saved as a text file or
// printed; the person confirms they are safe before moving on.
export default function BackupCodes({
  codes,
  username,
  onDone,
  doneLabel,
}: {
  codes: string[];
  username: string;
  onDone: () => void;
  doneLabel: string;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = `iDesignStudio.ro admin (${username}) - coduri de rezerva\n\n${codes.join("\n")}\n\nFiecare cod merge o singura data.\n`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `coduri-rezerva-${username.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const smallButton =
    "rounded-full border border-taupe-400 px-4 py-1.5 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-taupe-700">
        Acestea sunt cele <strong>20 de coduri de rezervă</strong>. Le vezi
        doar acum. Fiecare merge o singură dată, când nu ai telefonul la tine.
        Păstrează-le într-un loc sigur (manager de parole sau hârtie), nu în
        e-mail.
      </p>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-cream-50 p-4 font-mono text-sm text-taupe-800">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={smallButton}>
          {copied ? "Copiate" : "Copiază"}
        </button>
        <button type="button" onClick={download} className={smallButton}>
          Descarcă (.txt)
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className={smallButton}
        >
          Tipărește
        </button>
      </div>
      <label className="flex items-start gap-2 text-sm text-taupe-700">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-salamander-500"
        />
        Am salvat codurile într-un loc sigur.
      </label>
      <button
        type="button"
        disabled={!saved}
        onClick={onDone}
        className="rounded-full bg-salamander-500 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
      >
        {doneLabel}
      </button>
    </div>
  );
}
