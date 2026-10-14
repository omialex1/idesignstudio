// Matching of a typed locality against the list of a county. Pure, so the
// browser (to guide the customer) and the server (the real check) agree.

export type LocalityMatch =
  | { status: "exact"; value: string } // found; value is the official spelling
  | { status: "ambiguous"; options: string[] } // several villages share the name
  | { status: "unknown" }; // not in the list

export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[,\s-]+/g, " ")
    .trim();
}

// The part before the comma: "Aranghel, comuna Aninoasa" -> "Aranghel"
const plainName = (display: string) => display.split(",")[0];

export function matchLocality(list: string[], input: string): LocalityMatch {
  const wanted = fold(input);
  if (!wanted) return { status: "unknown" };

  // exact (any case, with or without diacritics): "aranghel, comuna aninoasa"
  const exact = list.find((display) => fold(display) === wanted);
  if (exact) return { status: "exact", value: exact };

  // only the village name typed: fine when one village has that name
  const sameName = list.filter(
    (display) => fold(plainName(display)) === wanted,
  );
  if (sameName.length === 1) return { status: "exact", value: sameName[0] };
  if (sameName.length > 1) return { status: "ambiguous", options: sameName };

  return { status: "unknown" };
}

// What kind of place a city/town is (used to label and rank suggestions).
export type UrbanKind = "seat" | "municipality" | "town" | "sector";

const KIND_RANK: Record<UrbanKind, number> = {
  seat: 0,
  sector: 0,
  municipality: 1,
  town: 2,
};

// Suggestions for what the customer has typed, best first. Works without
// diacritics and in any case. Cities, towns and municipalities come before
// villages with the same match quality, and a place whose name equals the typed
// text comes first, even when it is typed in full.
export function suggestLocalities(
  list: string[],
  urban: Record<string, UrbanKind>,
  typed: string,
  limit = 40,
): string[] {
  const q = fold(typed);
  const kindOf = (display: string) => urban[display];

  if (!q) {
    // nothing typed yet: the county's cities and towns
    return list
      .filter((d) => kindOf(d))
      .sort(
        (a, b) =>
          KIND_RANK[kindOf(a)!] - KIND_RANK[kindOf(b)!] ||
          a.localeCompare(b, "ro"),
      )
      .slice(0, limit);
  }

  const scored: { display: string; score: number }[] = [];
  for (const display of list) {
    const full = fold(display);
    const plain = fold(plainName(display));
    let score: number;
    if (plain === q) score = 0;
    else if (full === q) score = 1;
    else if (plain.startsWith(q)) score = 2;
    else if (full.startsWith(q)) score = 3;
    else if (full.includes(q)) score = 4;
    else continue;
    scored.push({ display, score });
  }

  return scored
    .sort((a, b) => {
      const ka = kindOf(a.display);
      const kb = kindOf(b.display);
      return (
        a.score - b.score ||
        (ka ? KIND_RANK[ka] : 9) - (kb ? KIND_RANK[kb] : 9) ||
        a.display.localeCompare(b.display, "ro")
      );
    })
    .slice(0, limit)
    .map((x) => x.display);
}
