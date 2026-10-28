"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MAX_QUERY_LENGTH } from "@/lib/search";

// The search box: used in the header panel and on the results page. Enter or
// the button opens the results page for what was typed.
export default function SearchForm({
  initialQuery = "",
  autoFocus = false,
  onSubmitted,
  tone = "light",
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
  // "dark" for the chocolate header panel
  tone?: "light" | "dark";
}) {
  const t = useTranslations("Search");
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const input = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = value.trim();
    if (!query) {
      input.current?.focus();
      return;
    }
    router.push(`/search?q=${encodeURIComponent(query)}`);
    onSubmitted?.();
  }

  const dark = tone === "dark";

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex w-full max-w-xl items-center gap-2"
    >
      <input
        ref={input}
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={MAX_QUERY_LENGTH}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        className={`min-w-0 flex-1 rounded-full border px-4 py-2 text-sm outline-none transition-colors ${
          dark
            ? "border-white/25 bg-white/10 text-cream-50 placeholder:text-cream-100/60 focus:border-gold-400"
            : "border-cream-300 bg-white text-taupe-800 placeholder:text-taupe-400 focus:border-salamander-400"
        }`}
      />
      <button
        type="submit"
        className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
          dark
            ? "bg-gold-400 text-choc hover:bg-gold-300"
            : "bg-salamander-500 text-cream-50 hover:bg-salamander-600"
        }`}
      >
        {t("button")}
      </button>
    </form>
  );
}
