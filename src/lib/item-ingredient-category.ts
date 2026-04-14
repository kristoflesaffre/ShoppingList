import ingredientCategories from "@/lib/data/ingredient_categories.json";

type IngredientCategoriesFile = {
  categoryOrder: string[];
  ingredientToCategory: Record<string, string>;
};

const data = ingredientCategories as IngredientCategoriesFile;

export const ITEM_CATEGORY_OVERIG = "Overig";

const Z = "Zuivel, Kaas & Eieren";
const GF = "Groenten & Fruit";
const V = "Vlees & Charcuterie";
const VZ = "Vis & Zeevruchten";
const B = "Brood";
const BE = "Beleg";
const D = "Droogwaren & Bakproducten";
const C = "Conserven, Sauzen, Olie & Kruiden";
const ZS = "Zoute Snacks";
const SC = "Snoep & Chocolade";
const WD = "Warme Dranken";
const KD = "Koude Dranken";
const DP = "Diepvries";
const H = "Huishouden & Schoonmaak";
const PV = "Persoonlijke Verzorging";
const DV = "Dierenvoeding";

/**
 * Fallback zolang `ingredientToCategory` in de Excel-export leeg is of een item ontbreekt.
 * Excel (`npm run sync:ingredient-categories`) gaat altijd vóór; daarna woord-/zinsdelen.
 */
const DEFAULT_CATEGORY_HINTS: Record<string, string> = {
  eieren: Z,
  ei: Z,
  yoghurt: Z,
  melk: Z,
  boter: Z,
  kaas: Z,
  kwark: Z,
  room: Z,
  slagroom: Z,
  mascarpone: Z,
  crème: Z,
  creme: Z,
  appels: GF,
  appel: GF,
  peren: GF,
  peer: GF,
  bananen: GF,
  banaan: GF,
  sinaasappels: GF,
  mandarijnen: GF,
  citroenen: GF,
  tomaten: GF,
  tomaat: GF,
  wortelen: GF,
  wortel: GF,
  paprika: GF,
  komkommer: GF,
  broccoli: GF,
  uien: GF,
  ui: GF,
  knoflook: GF,
  aardappelen: GF,
  aardappel: GF,
  krieltjes: GF,
  sla: GF,
  spinazie: GF,
  courgette: GF,
  aubergine: GF,
  champignons: GF,
  paddenstoelen: GF,
  salami: V,
  ham: V,
  bacon: V,
  worst: V,
  gehakt: V,
  kip: V,
  kipfilet: V,
  biefstuk: V,
  steak: V,
  spek: V,
  zalm: VZ,
  tonijn: VZ,
  kabeljauw: VZ,
  garnalen: VZ,
  vis: VZ,
  brood: B,
  baguette: B,
  croissants: B,
  pistolets: B,
  confituur: BE,
  choco: BE,
  nutella: BE,
  hagelslag: BE,
  pindakaas: BE,
  honing: BE,
  jam: BE,
  rijst: D,
  pasta: D,
  spaghetti: D,
  meel: D,
  suiker: D,
  bloem: D,
  olie: C,
  olijfolie: C,
  ketchup: C,
  mayonaise: C,
  mosterd: C,
  saus: C,
  tomatenpuree: C,
  chips: ZS,
  nootjes: ZS,
  popcorn: ZS,
  chocolade: SC,
  snoep: SC,
  koeken: SC,
  koekjes: SC,
  koffie: WD,
  thee: WD,
  cola: KD,
  water: KD,
  sap: KD,
  fruitsap: KD,
  limonade: KD,
  bier: KD,
  wijn: KD,
  pizza: DP,
  friet: DP,
  "frietjes": DP,
  aardappelnootjes: DP,
  kroketten: DP,
  bitterballen: DP,
  ijs: DP,
  diepvries: DP,
  wasmiddel: H,
  afwasmiddel: H,
  toiletpapier: H,
  keukenrol: H,
  shampo: PV,
  shampoo: PV,
  tandpasta: PV,
  zeep: PV,
  hondenvoer: DV,
  kattenvoer: DV,
};

/**
 * Gelijk aan Excel-sync: underscores → spatie, kleine letters, accenten weg,
 * zodat `pepsi_max` / «Pepsi max» / «Maïs» / `mais` dezelfde sleutel krijgen.
 */
function normalizeIngredientKey(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Zinnen in de app die in de Excel onder een andere sleutel staan. */
const SYNONYM_TO_CANONICAL_INGREDIENT: Record<string, string> = {
  "pot pastasaus": "passata",
  pastasaus: "passata",
};

function excelLookupKeysForName(name: string): string[] {
  const n = normalizeIngredientKey(name);
  const keys = new Set<string>();
  keys.add(n);
  keys.add(n.replace(/\s/g, "_"));
  const syn = SYNONYM_TO_CANONICAL_INGREDIENT[n];
  if (syn) {
    const s = normalizeIngredientKey(syn);
    keys.add(s);
    keys.add(s.replace(/\s/g, "_"));
  }
  return Array.from(keys);
}

function categoryFromDefaultHints(normalizedFull: string): string | null {
  const direct = DEFAULT_CATEGORY_HINTS[normalizedFull];
  if (direct) return direct;
  const parts = normalizedFull.split(" ").filter((p) => p.length >= 3);
  for (const p of parts) {
    const hit = DEFAULT_CATEGORY_HINTS[p];
    if (hit) return hit;
  }
  return null;
}

/** Categorie: eerst Excel-mapping, dan ingebouwde hints, anders `Overig`. */
export function resolveItemCategoryFromName(name: string): string {
  const key = normalizeIngredientKey(name);
  for (const k of excelLookupKeysForName(name)) {
    const fromExcel = data.ingredientToCategory[k];
    if (fromExcel && fromExcel.trim().length > 0) return fromExcel.trim();
  }
  const fromHints = categoryFromDefaultHints(key);
  if (fromHints) return fromHints;
  return ITEM_CATEGORY_OVERIG;
}

export function effectiveItemCategory(item: {
  name: string;
  itemCategory?: string | null;
}): string {
  const stored =
    typeof item.itemCategory === "string" ? item.itemCategory.trim() : "";
  if (stored.length > 0) return stored;
  return resolveItemCategoryFromName(item.name);
}

/** Sorteert categorieën volgens `categoryOrder` in JSON; onbekende sleutels achteraan. */
export function orderedCategorySectionTitles(keys: string[]): string[] {
  const order = data.categoryOrder;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of order) {
    if (keys.includes(c) && !seen.has(c)) {
      out.push(c);
      seen.add(c);
    }
  }
  for (const k of keys) {
    if (!seen.has(k)) {
      out.push(k);
      seen.add(k);
    }
  }
  return out;
}

export function categoryHeadingDisplay(title: string): string {
  return title.toLocaleUpperCase("nl-NL");
}
