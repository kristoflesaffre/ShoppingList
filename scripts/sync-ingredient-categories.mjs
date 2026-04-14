/**
 * Leest `public/images/items/ingredienten_categorieen.xlsx` en schrijft
 * `src/lib/data/ingredient_categories.json`.
 *
 * Verwachte werkbladen:
 * - **Categorieën** (of eerste blad): één kolom met kop "Categorie" → vaste volgorde secties.
 * - **Ingrediënten** (of **Ingredienten**): kolommen "Ingredient" + "Categorie" → mapping.
 *
 * Na wijzigingen in de Excel: `npm run sync:ingredient-categories`
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const excelPath = path.join(
  root,
  "public/images/items/ingredienten_categorieen.xlsx",
);
const outPath = path.join(root, "src/lib/data/ingredient_categories.json");

const OVERIG = "Overig";

/** Zelfde regels als in `src/lib/item-ingredient-category.ts` (underscores, accenten). */
function normalizeIngredientKey(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function findSheet(wb, candidates) {
  const names = wb.SheetNames;
  for (const want of candidates) {
    const hit = names.find(
      (n) => n === want || n.toLowerCase() === want.toLowerCase(),
    );
    if (hit) return wb.Sheets[hit];
  }
  return null;
}

function parseCategoryOrderFromRows(rows) {
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const cell = String(rows[i][0] ?? "").trim();
    if (cell && cell.toLowerCase() !== "categorie") out.push(cell);
  }
  return out;
}

function parseIngredientSheet(rows) {
  /** @type {Record<string, string>} */
  const map = {};
  if (rows.length < 2) return map;
  const header = (rows[0] ?? []).map((c) => String(c).trim().toLowerCase());
  const idxIng = header.findIndex(
    (h) =>
      h.includes("ingredi") ||
      h === "artikel" ||
      h === "naam" ||
      h === "item" ||
      h === "product",
  );
  const idxCat = header.findIndex((h) => h.includes("categor"));
  const colIng = idxIng >= 0 ? idxIng : 0;
  const colCat = idxCat >= 0 ? idxCat : 1;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const ing = String(row[colIng] ?? "").trim();
    const cat = String(row[colCat] ?? "").trim();
    if (!ing || !cat) continue;
    map[normalizeIngredientKey(ing)] = cat;
  }
  return map;
}

const wb = XLSX.readFile(excelPath);

const catSheet =
  findSheet(wb, ["Categorieën", "Categorieen"]) ?? wb.Sheets[wb.SheetNames[0]];
const catRows = XLSX.utils.sheet_to_json(catSheet, { header: 1, defval: "" });
let categoryOrder = parseCategoryOrderFromRows(catRows);

/** @type {Record<string, string>} */
let ingredientToCategory = {};
const ingSheet = findSheet(wb, ["Ingrediënten", "Ingredienten"]);
if (ingSheet) {
  ingredientToCategory = parseIngredientSheet(
    XLSX.utils.sheet_to_json(ingSheet, { header: 1, defval: "" }),
  );
} else {
  /** Fallback: enig blad met Ingredient + Categorie (oude één-bestand-layout). */
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      defval: "",
    });
    const maxCols = rows.reduce((m, row) => Math.max(m, row.length), 0);
    if (maxCols < 2) continue;
    const header = (rows[0] ?? []).map((c) => String(c).trim().toLowerCase());
    const hasIng = header.some(
      (h) =>
        h.includes("ingredi") ||
        h === "artikel" ||
        h === "naam" ||
        h === "item" ||
        h === "product",
    );
    const hasCat = header.some((h) => h.includes("categor"));
    if (!hasIng || !hasCat) continue;
    ingredientToCategory = parseIngredientSheet(rows);
    break;
  }
}

for (const cat of new Set(Object.values(ingredientToCategory))) {
  if (!categoryOrder.includes(cat)) {
    const oi = categoryOrder.indexOf(OVERIG);
    if (oi >= 0) categoryOrder.splice(oi, 0, cat);
    else categoryOrder.push(cat);
  }
}

if (!categoryOrder.includes(OVERIG)) {
  categoryOrder.push(OVERIG);
}

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "public/images/items/ingredienten_categorieen.xlsx",
  categoryOrder,
  ingredientToCategory,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${outPath} (${categoryOrder.length} categories, ${Object.keys(ingredientToCategory).length} ingredient mappings)`,
);
