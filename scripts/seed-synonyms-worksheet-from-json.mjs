/**
 * Vult of vervangt het werkblad "Synoniemen" in `ingredienten_categorieen.xlsx`
 * vanuit `public/ingredient-synonyms.json`:
 * - Kolom A = slug (PNG-basis); kolommen B… = alle synoniemen voor die slug.
 *
 *   node scripts/seed-synonyms-worksheet-from-json.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "public/ingredient-synonyms.json");
const excelPath = path.join(
  root,
  "public/images/items/ingredienten_categorieen.xlsx",
);

const SYN_SHEET_CANDIDATES = ["Synoniemen", "Synonyms", "Synonymen"];
const NEW_SHEET_NAME = "Synoniemen";

function findSheetName(wb) {
  for (const want of SYN_SHEET_CANDIDATES) {
    const hit = wb.SheetNames.find(
      (n) => n === want || n.toLowerCase() === want.toLowerCase(),
    );
    if (hit) return hit;
  }
  return null;
}

function removeSheet(wb, name) {
  const i = wb.SheetNames.indexOf(name);
  if (i < 0) return;
  delete wb.Sheets[name];
  wb.SheetNames.splice(i, 1);
}

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
/** @type {Map<string, string[]>} */
const bySlug = new Map();
for (const [synKey, slug] of Object.entries(raw)) {
  if (synKey.startsWith("_") || typeof slug !== "string") continue;
  const list = bySlug.get(slug);
  if (list) list.push(synKey);
  else bySlug.set(slug, [synKey]);
}

const slugsSorted = Array.from(bySlug.keys()).sort((a, b) =>
  a.localeCompare(b, "nl"),
);
for (const s of slugsSorted) {
  bySlug.get(s).sort((a, b) => a.localeCompare(b, "nl"));
}

let maxSyn = 0;
for (const s of slugsSorted) {
  maxSyn = Math.max(maxSyn, bySlug.get(s).length);
}
const colCount = 1 + maxSyn;

/** @type {string[][]} */
const header = ["Afbeelding (png / slug)"];
for (let i = 1; i < colCount; i++) {
  header.push(`Synoniem ${i}`);
}

/** @type {string[][]} */
const aoa = [header];
for (const slug of slugsSorted) {
  const syns = bySlug.get(slug);
  const row = [slug, ...syns];
  while (row.length < colCount) row.push("");
  aoa.push(row);
}

const wb = XLSX.readFile(excelPath);
const existing = findSheetName(wb);
if (existing) removeSheet(wb, existing);

wb.SheetNames.push(NEW_SHEET_NAME);
wb.Sheets[NEW_SHEET_NAME] = XLSX.utils.aoa_to_sheet(aoa);

XLSX.writeFile(wb, excelPath);
const totalSyns = slugsSorted.reduce((n, s) => n + bySlug.get(s).length, 0);
console.log(
  `Wrote werkblad "${NEW_SHEET_NAME}" in ${excelPath} (${slugsSorted.length} PNG-rijen, ${totalSyns} synoniemen, ${maxSyn} max kolommen na slug).`,
);
