/**
 * Voegt ontbrekende product-slugs (uit public/images/items/*.webp) toe aan
 * ingredienten_categorieen.xlsx en werkt Synoniemen bij.
 *
 *   node scripts/append-missing-ingredient-categories.mjs
 *   npm run sync:ingredient-categories
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
const itemsDir = path.join(root, "public/images/items");

const GF = "Groenten & Fruit";
const Z = "Zuivel, Kaas & Eieren";
const V = "Vlees & Charcuterie";
const VZ = "Vis & Zeevruchten";
const B = "Brood";
const BE = "Beleg";
const DP = "Diepvries";
const D = "Droogwaren & Bakproducten";
const C = "Conserven, Sauzen, Olie & Kruiden";
const ZS = "Zoute Snacks";
const SC = "Snoep & Chocolade";
const WD = "Warme Dranken";
const KD = "Koude Dranken";
const H = "Huishouden & Schoonmaak";
const PV = "Persoonlijke Verzorging";
const DV = "Dierenvoeding";

/** slug → { category, synonyms: extra zoektermen (slug zelf staat in kolom A) } */
const NEW_ITEMS = {
  alpro_kokosdrink: { category: Z, synonyms: ["alpro kokosdrink", "kokosdrink"] },
  alpro_vanilla_dessert: {
    category: Z,
    synonyms: ["alpro vanilla dessert", "vanille dessert"],
  },
  baking_soda: { category: D, synonyms: ["baking soda", "zuiveringszout"] },
  cacaopoeder: { category: D, synonyms: ["cacaopoeder", "cacao poeder"] },
  cappellini_pasta: { category: D, synonyms: ["cappellini", "cappellini pasta"] },
  carres_hele_hazelnoten_chocolade: {
    category: SC,
    synonyms: ["carrés hazelnoot chocolade", "hazelnoot chocolade"],
  },
  cayennepeper: { category: C, synonyms: ["cayennepeper", "cayenne peper"] },
  curry_poeder: { category: C, synonyms: ["curry poeder", "kerriepoeder"] },
  ferrero_rocher_chocolade: {
    category: SC,
    synonyms: ["ferrero rocher", "rocher"],
  },
  ginger_beer: { category: KD, synonyms: ["ginger beer", "gemberbier"] },
  handzeep: { category: PV, synonyms: ["handzeep", "zeep"] },
  kaas_blok: { category: Z, synonyms: ["kaas blok", "blok kaas"] },
  kaas_blokjes: { category: Z, synonyms: ["kaas blokjes"] },
  kaas_sneetjes: { category: Z, synonyms: ["kaas sneetjes", "plakken kaas"] },
  kattekorrels: { category: DV, synonyms: ["kattenkorrels", "kattenvoer"] },
  kauwgom: { category: SC, synonyms: ["kauwgom", "chewing gum"] },
  kinder_surprise: { category: SC, synonyms: ["kinder surprise", "kinder ei"] },
  kip_curry: { category: C, synonyms: ["kip curry", "kipcurry"] },
  kleine_flesje_wijn_rood: {
    category: KD,
    synonyms: ["kleine fles wijn rood", "wijn rood klein"],
  },
  kleine_flesje_wijn_rose: {
    category: KD,
    synonyms: ["kleine fles wijn rosé", "wijn rosé klein"],
  },
  kleine_flesje_wijn_wit: {
    category: KD,
    synonyms: ["kleine fles wijn wit", "wijn wit klein"],
  },
  koffiebonen: { category: WD, synonyms: ["koffiebonen", "koffie bonen"] },
  kokosyoghurt: { category: Z, synonyms: ["kokosyoghurt", "kokos yoghurt"] },
  leo_go_mini: { category: SC, synonyms: ["leo go mini", "leo"] },
  lookpoeder: { category: C, synonyms: ["lookpoeder", "knoflookpoeder"] },
  loze_vinken: { category: SC, synonyms: ["loze vinken", "jules destrooper"] },
  melk_halfvol: { category: Z, synonyms: ["melk halfvol", "halfvolle melk"] },
  melk_mager: { category: Z, synonyms: ["melk mager", "magere melk"] },
  melk_vol: { category: Z, synonyms: ["melk vol", "volle melk"] },
  melkchocolade_hazelnoten: {
    category: SC,
    synonyms: ["melkchocolade hazelnoot", "chocolade hazelnoot"],
  },
  melkchocolade_karamel_zeezout: {
    category: SC,
    synonyms: ["melkchocolade karamel zeezout", "karamel zeezout chocolade"],
  },
  parmezaan_blok: { category: Z, synonyms: ["parmezaan blok", "parmesan blok"] },
  parmezaan_zakje: {
    category: Z,
    synonyms: ["parmezaan zakje", "geraspte parmezaan"],
  },
  pastasaus_pot: { category: C, synonyms: ["pastasaus pot", "pot pastasaus"] },
  penne_pasta: { category: D, synonyms: ["penne", "penne pasta"] },
  pepersalami: { category: V, synonyms: ["pepersalami", "peper salami"] },
  pick_up_koekjes: { category: SC, synonyms: ["pick up koekjes", "pick up"] },
  pure_chocolade: { category: SC, synonyms: ["pure chocolade", "donkere chocolade"] },
  raffaello: { category: SC, synonyms: ["raffaello"] },
  rijstwafels: { category: ZS, synonyms: ["rijstwafels", "rijstwafel"] },
  room_40_procent_vet: {
    category: Z,
    synonyms: ["room 40%", "kookroom", "slagroom 40"],
  },
  room_7_procent_vet: {
    category: Z,
    synonyms: ["room 7%", "koffieroom", "kookroom light"],
  },
  sake: { category: KD, synonyms: ["sake", "rijstwijn sake"] },
  sandwiches_zak: { category: B, synonyms: ["sandwiches zak", "sandwich zak"] },
  schnitzel: { category: V, synonyms: ["schnitzel", "kipschnitzel"] },
  seaweed_chips: { category: ZS, synonyms: ["seaweed chips", "zeewier chips"] },
  sesamolie: { category: C, synonyms: ["sesamolie", "sesam olie"] },
  spirelli_pasta: { category: D, synonyms: ["spirelli", "spirelli pasta"] },
  suikerspin: { category: SC, synonyms: ["suikerspin"] },
  suikerwafel: { category: SC, synonyms: ["suikerwafel", "suikerwafels"] },
  tandoori_poeder: { category: C, synonyms: ["tandoori poeder", "tandoori"] },
  toastjes: { category: B, synonyms: ["toastjes", "toast"] },
  vuilzakken: { category: H, synonyms: ["vuilzakken", "afvalzakken"] },
  witte_peper_poeder: {
    category: C,
    synonyms: ["witte peper poeder", "witte peper gemalen"],
  },
  witte_peperbollen: { category: C, synonyms: ["witte peperbollen", "witte peper"] },
  zwarte_peperbollen: {
    category: C,
    synonyms: ["zwarte peperbollen", "zwarte peper"],
  },
  chips_croky_paprika_rings: {
    category: ZS,
    synonyms: ["croky paprika rings", "croky chips paprika"],
  },
  chips_paprika: { category: ZS, synonyms: ["paprika chips", "chips paprika"] },
  chips_pickles: {
    category: ZS,
    synonyms: ["pickles chips", "augurken chips"],
  },
  chips_salt_and_vinegar: {
    category: ZS,
    synonyms: ["salt and vinegar chips", "zout azijn chips"],
  },
  chips_zout: { category: ZS, synonyms: ["zoute chips", "chips zout"] },
  confituur: { category: BE, synonyms: ["jam", "confiture", "fruitbeleg"] },
  coquilles: {
    category: VZ,
    synonyms: ["sint-jakobsschelpen", "jakobsschelpen"],
  },
  gerookte_zalmhaasje: {
    category: VZ,
    synonyms: ["gerookte zalm", "rookzalm", "zalmhaasje"],
  },
  huishoudfolie: {
    category: H,
    synonyms: ["aluminiumfolie", "afdeklfolie", "vershoudfolie"],
  },
  pompoen: { category: GF, synonyms: ["pumpkin", "pompoenstuk"] },
  smeerboter: {
    category: Z,
    synonyms: ["boter om te smeren", "roomboter kuip"],
  },
  speculoospasta: {
    category: BE,
    synonyms: ["speculoos pasta", "speculaas pasta", "speculoos spread"],
  },
  "vol-au-vent_koekje": {
    category: DP,
    synonyms: ["vol au vent koekje", "vol-au-vent bladerdeeghapje"],
  },
  "vol-au-vent_voorgemaakt": {
    category: DP,
    synonyms: ["vol au vent voorgemaakt", "vol-au-vent gerecht"],
  },
  zuur_fruit_snoep: {
    category: SC,
    synonyms: ["zure snoepjes", "zuurtjes", "zuur fruit"],
  },
  vleesje_noë: {
    category: V,
    synonyms: ["vleesje noë", "vleesje noe"],
  },
};

function normalizeIngredientKey(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function slugFromFilename(f) {
  const m = f.match(/^(.+)_(160|240|320)\.webp$/);
  return m ? m[1] : null;
}

function labelFromSlug(slug) {
  return slug.replace(/_/g, " ");
}

const wb = XLSX.readFile(excelPath);
const ingName = wb.SheetNames.find(
  (n) => n === "Ingrediënten" || n.toLowerCase() === "ingredienten",
);
const synName = wb.SheetNames.find(
  (n) =>
    n === "Synoniemen" ||
    n.toLowerCase() === "synonyms" ||
    n.toLowerCase() === "synonymen",
);
if (!ingName) throw new Error("Werkblad Ingrediënten niet gevonden");

const ingRows = XLSX.utils.sheet_to_json(wb.Sheets[ingName], {
  header: 1,
  defval: "",
});
const existingIng = new Set(
  ingRows.slice(1).map((r) => normalizeIngredientKey(String(r[0] ?? ""))),
);

let addedIng = 0;
for (const [slug, { category }] of Object.entries(NEW_ITEMS)) {
  const key = normalizeIngredientKey(slug);
  if (existingIng.has(key)) continue;
  ingRows.push([slug, category]);
  existingIng.add(key);
  addedIng++;
}

wb.Sheets[ingName] = XLSX.utils.aoa_to_sheet(ingRows);

if (synName) {
  const synRows = XLSX.utils.sheet_to_json(wb.Sheets[synName], {
    header: 1,
    defval: "",
  });
  const header = synRows[0] ?? ["Afbeelding (png / slug)"];
  const maxSynCols = Math.max(
    header.length,
    ...synRows.map((r) => r.length),
    9,
  );
  while (header.length < maxSynCols) {
    header.push(`Synoniem ${header.length}`);
  }
  synRows[0] = header;

  const slugCol = 0;
  const existingSynSlug = new Set(
    synRows.slice(1).map((r) => String(r[slugCol] ?? "").trim()),
  );

  let addedSyn = 0;
  for (const [slug, { synonyms }] of Object.entries(NEW_ITEMS)) {
    const rowSynonyms = [
      labelFromSlug(slug),
      ...synonyms.filter((s) => normalizeIngredientKey(s) !== normalizeIngredientKey(slug)),
    ];
    const unique = [...new Set(rowSynonyms.map((s) => s.trim()).filter(Boolean))];

    if (existingSynSlug.has(slug)) {
      const idx = synRows.findIndex(
        (r, i) => i > 0 && String(r[slugCol] ?? "").trim() === slug,
      );
      if (idx >= 0) {
        const row = [slug, ...unique];
        while (row.length < maxSynCols) row.push("");
        synRows[idx] = row;
      }
      continue;
    }

    const row = [slug, ...unique];
    while (row.length < maxSynCols) row.push("");
    synRows.push(row);
    existingSynSlug.add(slug);
    addedSyn++;
  }

  wb.Sheets[synName] = XLSX.utils.aoa_to_sheet(synRows);
  console.log(`Synoniemen: ${addedSyn} nieuwe rijen, bestaande bijgewerkt waar nodig`);
}

XLSX.writeFile(wb, excelPath);
console.log(`Excel bijgewerkt: ${addedIng} ingrediënten toegevoegd aan ${excelPath}`);

// Verifieer: alle image-slugs hebben nu een categorie
const slugs = new Set();
for (const f of fs.readdirSync(itemsDir)) {
  const s = slugFromFilename(f);
  if (s) slugs.add(s);
}
const wb2 = XLSX.readFile(excelPath);
const rows2 = XLSX.utils.sheet_to_json(wb2.Sheets[ingName], {
  header: 1,
  defval: "",
});
const mapped = new Set(
  rows2.slice(1).map((r) => normalizeIngredientKey(String(r[0] ?? ""))),
);
const stillMissing = [...slugs].filter(
  (s) => !mapped.has(normalizeIngredientKey(s)),
);
if (stillMissing.length > 0) {
  console.warn(
    "Nog zonder categorie in Excel:",
    stillMissing.sort().join(", "),
  );
  process.exit(1);
}
console.log(`OK: alle ${slugs.size} product-slugs hebben een categorie in Excel.`);
