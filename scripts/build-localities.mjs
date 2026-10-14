// Builds lib/geo/localities.json from the official SIRUTA file (data.gov.ro,
// published by the National Institute of Statistics).
//
//   node scripts/build-localities.mjs <path to siruta csv>
//
// Source used for the current file: "SIRUTA_s1 2026" (semester 1 2026),
// https://data.gov.ro/dataset/721c9059-5f87-4c79-9854-a1d5c18f58d5
// Rerun this with the next SIRUTA release (published twice a year) to refresh.
//
// What a customer can choose: every town, village and city district, written as
// "Village, comuna X" when the name differs from its commune/town, so that the
// many villages with the same name stay apart. Bucharest lists its 6 sectors.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/build-localities.mjs <siruta csv>");
  process.exit(1);
}

const text = fs.readFileSync(input, "utf8").replace(/^﻿/, "");
const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
const header = headerLine.split(";");
const rows = lines.map((line) => {
  const cells = line.split(";");
  return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").replace(/^"|"$/g, "")]));
});
const byId = new Map(rows.map((r) => [r.SIRUTA, r]));

// SIRUTA uses the cedilla letters (ş ţ); Romanian spelling is comma-below (ș ț).
const fixLetters = (s) =>
  s.replace(/ş/g, "ș").replace(/Ş/g, "Ș").replace(/ţ/g, "ț").replace(/Ţ/g, "Ț");

const SMALL = new Set(["de", "din", "la", "pe", "cu", "a", "al", "ai", "lui", "sub", "peste", "dintre", "între"]);
const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i;

function title(raw) {
  const lower = fixLetters(raw).toLocaleLowerCase("ro");
  return lower
    .split(" ")
    .map((word, i) => {
      if (i > 0 && SMALL.has(word)) return word;
      if (ROMAN.test(word)) return word.toUpperCase();
      // capitalise the first letter of each part around hyphens and apostrophes
      return word.replace(/(^|[-'(])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase("ro"));
    })
    .join(" ");
}

const stripUatPrefix = (name) => name.replace(/^(MUNICIPIUL|ORA[ȘŞS]UL|ORA[ȘŞS]|COMUNA)\s+/i, "");
const fold = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s-]+/g, " ").trim();

const UAT_LABEL = { 1: "municipiul", 4: "municipiul", 2: "orașul", 5: "orașul", 3: "comuna" };
const PLACE_TYPES = new Set(["9", "10", "11", "17", "18", "19", "22", "23"]);

// county id -> official name
const counties = new Map();
for (const r of rows.filter((x) => x.TIP === "40")) {
  const name = title(stripUatPrefix(r.DENLOC.replace(/^JUDE[ȚŢT]UL\s+/i, "")));
  counties.set(r.JUD, name === "Municipiul București" ? "București" : name);
}
const bucharestId = [...counties].find(([, n]) => n === "București")?.[0];

const result = {};
for (const name of counties.values()) result[name] = new Set();

for (const r of rows) {
  const county = counties.get(r.JUD);
  if (!county) continue;

  // Bucharest: the six sectors
  if (r.JUD === bucharestId) {
    if (r.TIP === "6") {
      const sector = r.DENLOC.match(/(\d+)\s*$/)?.[1];
      if (sector) result[county].add(`București, Sector ${sector}`);
    }
    continue;
  }

  // Some towns have no separate row for their seat locality (e.g. Băile
  // Govora), so every town and municipality is added under its own name too.
  if (["1", "2", "4", "5"].includes(r.TIP)) {
    result[county].add(title(stripUatPrefix(r.DENLOC)));
    continue;
  }

  if (!PLACE_TYPES.has(r.TIP)) continue;
  const parent = byId.get(r.SIRSUP);
  const label = parent ? UAT_LABEL[parent.TIP] : undefined;
  const place = title(r.DENLOC);
  const parentName = parent ? title(stripUatPrefix(parent.DENLOC)) : "";
  const display =
    !label || fold(place) === fold(parentName) ? place : `${place}, ${label} ${parentName}`;
  result[county].add(display);
}

const collator = new Intl.Collator("ro");
const out = {};
let total = 0;
for (const [county, set] of Object.entries(result).sort(([a], [b]) => collator.compare(a, b))) {
  out[county] = [...set].sort(collator.compare);
  total += out[county].length;
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "geo");
fs.writeFileSync(
  path.join(dir, "localities.json"),
  JSON.stringify({ source: "SIRUTA s1 2026, data.gov.ro", counties: out }),
);
console.log(`counties: ${Object.keys(out).length}, localities: ${total}`);
console.log("Valcea sample:", out["Vâlcea"].slice(0, 6));
console.log("Bucuresti:", out["București"]);
