"use client";

import { useState } from "react";

// Delete with a confirmation. The server refuses (with a message shown here)
// when the item still holds other things.
export default function DeleteButton({
  action,
  id,
  label = "Șterge",
  confirmText,
  className = "text-sm font-medium text-red-600 hover:underline",
}: {
  action: (id: string) => Promise<{ error: string } | void>;
  id: string;
  label?: string;
  confirmText: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(confirmText)) return;
    setPending(true);
    setError(null);
    try {
      const result = await action(id);
      if (result && "error" in result) setError(result.error);
    } catch {
      setError("Nu am putut șterge. Încearcă din nou.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`${className} disabled:opacity-50`}
      >
        {pending ? "Se șterge..." : label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-right text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
