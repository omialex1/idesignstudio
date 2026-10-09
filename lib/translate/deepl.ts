// DeepL translation for the admin. Free-plan keys end in ":fx" and use a
// different host than paid keys.
export type Lang = "ro" | "en";

export class TranslationError extends Error {
  constructor(
    public code: "not_configured" | "invalid_key" | "quota" | "failed",
    message: string,
  ) {
    super(message);
  }
}

// Product and brand names written in capitals (TEAGRID, MORRA, IDESIGN...)
// must stay as they are.
const BRAND_WORD = /\b[A-ZĂÂÎȘȚ]{4,}\b/g;

export function protect(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(BRAND_WORD, "<keep>$&</keep>");
}

export function restore(output: string) {
  return output
    .replace(/<\/?keep>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export async function translateTexts(
  texts: string[],
  from: Lang,
): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new TranslationError("not_configured", "DEEPL_API_KEY is not set");
  }
  if (texts.length === 0) return [];

  const host = apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";

  const res = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts.map(protect),
      source_lang: from === "ro" ? "RO" : "EN",
      target_lang: from === "ro" ? "EN-GB" : "RO",
      tag_handling: "xml",
      ignore_tags: ["keep"],
      preserve_formatting: true,
    }),
  });

  if (res.status === 403) {
    throw new TranslationError("invalid_key", "DeepL rejected the key");
  }
  if (res.status === 456) {
    throw new TranslationError("quota", "DeepL quota exceeded");
  }
  if (!res.ok) {
    throw new TranslationError("failed", `DeepL error ${res.status}`);
  }

  const data = (await res.json()) as { translations: { text: string }[] };
  return data.translations.map((t) => restore(t.text));
}
