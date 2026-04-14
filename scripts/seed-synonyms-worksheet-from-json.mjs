/**
 * Vult of vervangt het werkblad "Synoniemen" in `ingredienten_categorieen.xlsx`
 * met rijen uit `public/ingredient-synonyms.json` (kolommen Synoniem + Slug).
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
/** @type {Array<[string, string]>} */
const pairs = [];
for (const [key, value] of Object.entries(raw)) {
  if (key.startsWith("_") || typeof value !== "string") continue;
  pairs.push([key, value]);
}
pairs.sort((a, b) => {
  const c = a[1].localeCompare(b[1], "nl");
  if (c !== 0) return c;
  return a[0].localeCompare(b[0], "nl");
});

const aoa = [["Synoniem", "Slug"], ...pairs];

const wb = XLSX.readFile(excelPath);
const existing = findSheetName(wb);
if (existing) removeSheet(wb, existing);

wb.SheetNames.push(NEW_SHEET_NAME);
wb.Sheets[NEW_SHEET_NAME] = XLSX.utils.aoa_to_sheet(aoa);

XLSX.writeFile(wb, excelPath);
console.log(
  `Wrote werkblad "${NEW_SHEET_NAME}" in ${excelPath} (${pairs.length} rijen + kop).`,
);
