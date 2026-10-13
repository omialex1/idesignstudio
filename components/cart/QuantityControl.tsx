"use client";

import { useState } from "react";

// − [number] + : the number can be typed, the buttons step by one. A valid
// number is applied while typing; an empty or zero field falls back to the
// current quantity when the field loses focus.
export default function QuantityControl({
  value,
  onChange,
  min = 1,
  max,
  label,
  allowRemove = false,
}: {
  value: number;
  onChange: (quantity: number) => void;
  min?: number;
  max: number;
  label: string;
  // the − button at the minimum asks for 0 (the cart removes the line)
  allowRemove?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function typed(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 5);
    const n = Number(digits);
    if (digits === "" || n < min) {
      setDraft(digits);
      return;
    }
    if (n > max) {
      setDraft(null);
      onChange(max);
      return;
    }
    setDraft(digits);
    onChange(n);
  }

  const button =
    "h-7 w-7 shrink-0 rounded-full border border-cream-200 text-taupe-700 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="−"
        disabled={!allowRemove && value <= min}
        onClick={() => {
          setDraft(null);
          onChange(value > min ? value - 1 : 0);
        }}
        className={button}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft ?? String(value)}
        onChange={(e) => typed(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setDraft(null)}
        className="w-14 rounded-lg border border-cream-200 bg-white py-1 text-center text-sm text-taupe-800 focus:border-salamander-400 focus:outline-none"
      />
      <button
        type="button"
        aria-label="+"
        disabled={value >= max}
        onClick={() => {
          setDraft(null);
          onChange(value + 1);
        }}
        className={button}
      >
        +
      </button>
    </div>
  );
}
