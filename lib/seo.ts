import { routing } from "@/i18n/routing";

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
}

// Canonical + hreflang links for a page that exists in every language.
// `path` is the part after the locale, e.g. "" or "/events/vaze".
export function pageAlternates(locale: string, path = "") {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}

export function shortText(text: string | null | undefined, max = 160) {
  if (!text) return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

// Public company data, also shown in the site footer.
export const COMPANY = {
  name: "IDESIGN STUDIO S.R.L.",
  brand: "iDesignStudio",
  email: "contact@idesignstudio.ro",
  phone: "+40755462190",
  street: "Str. Căpitan Negoescu, Nr. 10",
  city: "Râmnicu Vâlcea",
  region: "Vâlcea",
  country: "RO",
};
