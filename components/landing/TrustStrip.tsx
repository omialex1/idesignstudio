import { getTranslations } from "next-intl/server";

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  lock: (c: string) => (
    <Svg className={c}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2" />
    </Svg>
  ),
  returns: (c: string) => (
    <Svg className={c}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
      <path d="M4 4.5v4h4" />
    </Svg>
  ),
  shield: (c: string) => (
    <Svg className={c}>
      <path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-2.5z" />
      <path d="m9 12 2.3 2.3L15.3 10" />
    </Svg>
  ),
  pin: (c: string) => (
    <Svg className={c}>
      <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21z" />
      <circle cx="12" cy="10" r="2.3" />
    </Svg>
  ),
} as const;

const ITEMS = [
  { key: "trust1", icon: "lock" },
  { key: "trust2", icon: "returns" },
  { key: "trust3", icon: "shield" },
  { key: "trust4", icon: "pin" },
] as const;

// Four short reassurances right under the slideshow: the guarantees a hesitant buyer looks for.
export default async function TrustStrip() {
  const t = await getTranslations("Home");
  return (
    <section
      aria-label={t("trustLabel")}
      className="mx-auto w-full max-w-7xl px-6 pb-2"
    >
      <ul className="grid grid-cols-2 border-y border-gold-600/40 lg:grid-cols-4">
        {ITEMS.map(({ key, icon }, i) => (
          <li
            key={key}
            className={`flex flex-col items-center px-4 py-5 text-center ${
              i % 2 === 1 ? "border-l border-gold-600/30" : ""
            } ${i >= 2 ? "border-t border-gold-600/30 lg:border-t-0" : ""} ${
              i > 0 ? "lg:border-l lg:border-gold-600/30" : ""
            }`}
          >
            {ICONS[icon]("h-7 w-7 text-gold-600")}
            <span className="mt-2.5 text-sm font-semibold text-taupe-800">
              {t(`${key}Title`)}
            </span>
            <span className="mt-0.5 text-xs text-taupe-600">
              {t(`${key}Body`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
