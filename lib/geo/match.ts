// Matching of a typed locality against the list of a county. Pure, so the
// browser (to guide the customer) and the server (the real check) agree.

export type LocalityMatch =
  | { status: "exact"; value: string } // found; value is the official spelling
  | { status: "ambiguous"; options: string[] } // several villages share the name
  | { status: "unknown" }; // not in the list

function fold(value: string) {
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
