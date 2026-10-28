"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MAX_QUERY_LENGTH } from "@/lib/search";

type Suggestion = { name: string; href: string };

// The search box: used in the header panel, in the phone menu and on the results
// page. While typing it offers up to 3 products whose names start with the
// letters; Enter or the button opens the full results page.
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
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // the last answer, with the text it was asked for
  const [answer, setAnswer] = useState<{ q: string; items: Suggestion[] }>({
    q: "",
    items: [],
  });
  const input = useRef<HTMLInputElement>(null);

  const typed = value.trim();
  useEffect(() => {
    if (typed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `/api/search/suggest?q=${encodeURIComponent(typed)}&locale=${locale}`,
        { signal: controller.signal },
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setAnswer({ q: typed, items: data.suggestions ?? [] });
        })
        .catch(() => {
          // no suggestions: the search itself still works
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typed, locale]);

  // only an answer that belongs to the text now in the box is shown
  const items = typed.length >= 2 && answer.q === typed ? answer.items : [];
  const showList = open && items.length > 0;

  function go(href: string) {
    setOpen(false);
    router.push(href);
    onSubmitted?.();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (showList && active >= 0) {
      go(items[active].href);
      return;
    }
    if (!typed) {
      input.current?.focus();
      return;
    }
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(typed)}`);
    onSubmitted?.();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const dark = tone === "dark";

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="relative flex w-full max-w-xl items-center gap-2"
    >
      <input
        ref={input}
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        maxLength={MAX_QUERY_LENGTH}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 ? `${listId}-${active}` : undefined
        }
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

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("suggestions")}
          className={`absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-2xl border py-1 shadow-lg ${
            dark
              ? "border-white/15 bg-choc text-cream-50"
              : "border-cream-200 bg-white text-taupe-800"
          }`}
        >
          {items.map((item, index) => (
            <li
              key={item.href}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // mouse down (not click), so the box does not lose focus and close first
              onMouseDown={(e) => {
                e.preventDefault();
                go(item.href);
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-4 py-2 text-sm ${
                index === active
                  ? dark
                    ? "bg-white/10 text-gold-400"
                    : "bg-cream-100 text-salamander-600"
                  : ""
              }`}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
