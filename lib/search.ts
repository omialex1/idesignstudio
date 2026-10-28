// Text search shared by the shop and the admin. People type without diacritics
// ("globulet" for "Globuleț") and in any case, so both the query and the text
// are reduced to plain lower-case letters before they are compared.

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .toLowerCase();
}

export const MAX_QUERY_LENGTH = 80;

// Words of the query (at most 6), already normalized.
export function queryWords(query: string): string[] {
  return normalizeSearch(query.slice(0, MAX_QUERY_LENGTH))
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 6);
}

// Every word must appear somewhere in the text.
export function matchesAllWords(words: string[], haystack: string): boolean {
  const text = normalizeSearch(haystack);
  return words.every((word) => text.includes(word));
}

// Higher is a better match: words in the name count most, then the category,
// then the descriptions.
export function scoreMatch(
  words: string[],
  fields: { name: string; category: string; rest: string },
): number {
  const name = normalizeSearch(fields.name);
  const category = normalizeSearch(fields.category);
  const rest = normalizeSearch(fields.rest);
  let score = 0;
  for (const word of words) {
    if (name.startsWith(word)) score += 6;
    else if (name.includes(word)) score += 4;
    if (category.includes(word)) score += 2;
    if (rest.includes(word)) score += 1;
  }
  return score;
}
