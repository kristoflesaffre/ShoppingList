/**
 * Leest `public/images/vakantie/vakantie_items.xlsx` en schrijft
 * `src/lib/data/vacation_item_categories.json`.
 *
 * Werkblad **Items**: kolommen «Bestandsnaam», «Label», «Categorie» (Excel-categorie).
 * Excel-categorieën worden gemapt naar app-categorieën (`VACATION_CATEGORIES`).
 *
 * Na wijzigingen in de Excel: `npm run sync:vacation-categories`
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const excelPath = path.join(
  root,
  "public/images/vakantie/vakantie_items.xlsx",
);
const outPath = path.join(root, "src/lib/data/vacation_item_categories.json");

/** App-categorieën (zelfde volgorde als `VACATION_CATEGORIES` in vacation-categories.ts). */
const APP_CATEGORY_ORDER = [
  "Te regelen",
  "Toiletartikelen",
  "Kleding",
  "Eten & drinken",
  "Gekoelde eten en drank",
  "Elektronica",
  "Slaapspullen",
  "Documenten",
  "Medicijnen",
  "Huishouden",
  "Strand",
  "Speelgoed",
  "Accessoires",
  "Andere",
];

const ANDERE = "Andere";

/**
 * Fijne Excel-categorie → UI-categorie in de app.
 * Pas hier aan als de Excel-structuur wijzigt; daarna opnieuw syncen.
 */
const EXCEL_CATEGORY_TO_APP = {
  Kleding: "Kleding",
  Toiletartikelen: "Toiletartikelen",
  Voeding: "Eten & drinken",
  Elektronica: "Elektronica",
  Slapen: "Slaapspullen",
  Accessoires: "Accessoires",
  Documenten: "Documenten",
  "Medicatie/EHBO": "Medicijnen",
  Reisspullen: "Andere",
  Zwemmen: "Strand",
  Speelgoed: "Speelgoed",
  Huishouden: "Huishouden",
  Intiem: "Andere",
};

function normalizeItemKey(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function slugFromFilename(filename) {
  return String(filename ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.(png|webp|jpg|jpeg)$/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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

function parseItemsSheet(rows) {
  /** @type {Record<string, string>} */
  const itemToCategory = {};
  /** @type {Record<string, string>} */
  const slugToCategory = {};
  /** @type {Record<string, string>} */
  const excelCategoryToApp = { ...EXCEL_CATEGORY_TO_APP };

  if (rows.length < 2) return { itemToCategory, slugToCategory, excelCategoryToApp };

  const header = (rows[0] ?? []).map((c) => String(c).trim().toLowerCase());
  const idxFile = header.findIndex(
    (h) =>
      h.includes("bestand") ||
      h === "slug" ||
      h === "png" ||
      h.includes("afbeelding"),
  );
  const idxLabel = header.findIndex(
    (h) =>
      h === "label" ||
      h === "naam" ||
      h === "item" ||
      h === "product" ||
      h.includes("ingredi"),
  );
  const idxCat = header.findIndex((h) => h.includes("categor"));
  const colFile = idxFile >= 0 ? idxFile : 0;
  const colLabel = idxLabel >= 0 ? idxLabel : 1;
  const colCat = idxCat >= 0 ? idxCat : 2;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const file = String(row[colFile] ?? "").trim();
    const label = String(row[colLabel] ?? "").trim();
    const excelCat = String(row[colCat] ?? "").trim();
    if (!label && !file) continue;

    const appCat = EXCEL_CATEGORY_TO_APP[excelCat] ?? ANDERE;
    if (excelCat && !(excelCat in EXCEL_CATEGORY_TO_APP)) {
      console.warn(
        `[vakantie] onbekende Excel-categorie "${excelCat}" voor "${label || file}" → ${ANDERE}`,
      );
      excelCategoryToApp[excelCat] = ANDERE;
    }

    if (label) {
      const key = normalizeItemKey(label);
      if (key) itemToCategory[key] = appCat;
      const underscored = key.replace(/\s/g, "_");
      if (underscored && underscored !== key) {
        itemToCategory[underscored] = appCat;
      }
    }

    const slug = slugFromFilename(file);
    if (slug) slugToCategory[slug] = appCat;
  }

  return { itemToCategory, slugToCategory, excelCategoryToApp };
}

const wb = XLSX.readFile(excelPath);
const itemsSheet = findSheet(wb, ["Items", "Item", "Vakantie"]);
if (!itemsSheet) {
  console.error("Geen werkblad Items gevonden in", excelPath);
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(itemsSheet, { header: 1, defval: "" });
const { itemToCategory, slugToCategory, excelCategoryToApp } =
  parseItemsSheet(rows);

let existingSynonyms = {};
if (fs.existsSync(outPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    existingSynonyms = existing.synonymToCanonical ?? {};
  } catch {
    existingSynonyms = {};
  }
}

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "public/images/vakantie/vakantie_items.xlsx",
  categoryOrder: APP_CATEGORY_ORDER,
  excelCategoryToApp,
  itemToCategory,
  slugToCategory,
  synonymToCanonical: existingSynonyms,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${outPath} (${Object.keys(itemToCategory).length} label keys, ${Object.keys(slugToCategory).length} slug keys)`,
);
