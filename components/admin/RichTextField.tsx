"use client";

import { useRef, useState } from "react";
import { renderRichText } from "@/lib/rich-text";
import { controlClass } from "@/components/admin/FormBits";

// Textarea with Bold / Italic buttons. Formatting is stored as **bold** and
// *italic* around the selected words (Ctrl/Cmd+B and Ctrl/Cmd+I also work).
export default function RichTextField({
  name,
  label,
  hint,
  defaultValue,
  rows = 10,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: string;
  rows?: number;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);

  function wrap(marker: "**" | "*") {
    const el = area.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value: text } = el;
    const selected = text.slice(start, end);
    const len = marker.length;

    let next: string;
    let selStart: number;
    let selEnd: number;

    if (
      selected.length > len * 2 &&
      selected.startsWith(marker) &&
      selected.endsWith(marker)
    ) {
      // The selection itself is wrapped: take the marker off.
      const inner = selected.slice(len, selected.length - len);
      next = text.slice(0, start) + inner + text.slice(end);
      selStart = start;
      selEnd = start + inner.length;
    } else if (
      text.slice(start - len, start) === marker &&
      text.slice(end, end + len) === marker &&
      start >= len
    ) {
      // The markers sit just outside the selection: remove them.
      next = text.slice(0, start - len) + selected + text.slice(end + len);
      selStart = start - len;
      selEnd = selStart + selected.length;
    } else {
      next = text.slice(0, start) + marker + selected + marker + text.slice(end);
      selStart = start + len;
      selEnd = selStart + selected.length;
    }

    el.value = next;
    setValue(next);
    el.focus();
    el.setSelectionRange(selStart, selEnd);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      wrap("**");
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      wrap("*");
    }
  }

  const toolButton =
    "flex h-8 w-8 items-center justify-center rounded-md border border-cream-200 bg-white text-sm text-taupe-800 transition-colors hover:bg-cream-100";

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={name} className="font-medium text-taupe-700">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => wrap("**")}
          title="Aldin (Ctrl+B)"
          aria-label="Aldin"
          className={`${toolButton} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => wrap("*")}
          title="Cursiv (Ctrl+I)"
          aria-label="Cursiv"
          className={`${toolButton} italic`}
        >
          I
        </button>
        <span className="text-xs text-taupe-400">
          Selectează textul, apoi apasă B sau I.
        </span>
      </div>

      <textarea
        ref={area}
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        onInput={(e) => setValue(e.currentTarget.value)}
        onKeyDown={onKeyDown}
        className={controlClass()}
      />

      {value.includes("*") && (
        <div className="rounded-lg border border-cream-200 bg-cream-50 p-3">
          <p className="mb-1 text-xs font-medium text-taupe-500">
            Previzualizare
          </p>
          <p className="whitespace-pre-line text-taupe-700">
            {renderRichText(value)}
          </p>
        </div>
      )}

      {hint && <span className="text-xs text-taupe-400">{hint}</span>}
    </div>
  );
}
