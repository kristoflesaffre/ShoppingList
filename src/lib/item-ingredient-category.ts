import ingredientCategories from "@/lib/data/ingredient_categories.json";

type IngredientCategoriesFile = {
  categoryOrder: string[];
  ingredientToCategory: Record<string, string>;
  synonymToCanonical: Record<string, string>;
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
  ananas: GF,
  kiwi: GF,
  perziken: GF,
  perzik: GF,
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
  kippenvinken: V,
  pensen: V,
  "witte pensen": V,
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
  krabsla: BE,
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
  "red bull pink edition": KD,
  "red bull white edition": KD,
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

/** Zinnen in de app die naar een canonieke sleutel verwijzen (beheerd via admin tool). */
const SYNONYM_TO_CANONICAL_INGREDIENT: Record<string, string> =
  data.synonymToCanonical ?? {};

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

/** Parseert opgeslagen volgorde vanuit de lijst-entiteit (JSON-array van categorietitels). */
export function parseMasterCategoryOrderJson(
  raw: string | null | undefined,
): string[] | null {
  if (raw == null || typeof raw !== "string" || raw.trim() === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const titles = parsed.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
    return titles.length > 0 ? titles : null;
  } catch {
    return null;
  }
}

/**
 * Categorie-secties sorteren; optioneel `masterOrder` van deze masterlijst.
 * Sleutels die niet in `masterOrder` voorkomen worden achteraan gezet volgens de standaard JSON-volgorde.
 */
export function orderedCategorySectionTitlesWithMasterOverride(
  keys: string[],
  masterOrder: string[] | null,
): string[] {
  if (!masterOrder?.length) return orderedCategorySectionTitles(keys);
  const keySet = new Set(keys);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of masterOrder) {
    if (keySet.has(c) && !seen.has(c)) {
      out.push(c);
      seen.add(c);
    }
  }
  const remaining = keys.filter((k) => !seen.has(k));
  if (remaining.length === 0) return out;
  const tail = orderedCategorySectionTitles(remaining);
  for (const t of tail) {
    if (!seen.has(t)) {
      out.push(t);
      seen.add(t);
    }
  }
  return out;
}

/**
 * Weergavenaam van een categoriekop: sentence case (eerste letter hoofdletter).
 * Geen ALL-CAPS meer — categoriekoppen zijn gewone koppen in de typografische
 * hiërarchie en moeten leesbaar blijven voor screenreaders (caps worden soms gespeld).
 */
export function categoryHeadingDisplay(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase("nl-NL") + trimmed.slice(1);
}

/* ─── Vlees: subgroepen samen tonen (geen aparte categorie) ─── */

/**
 * Volgorde van vleessoorten binnen «Vlees & Charcuterie»: kip, kalkoen, rund & gehakt, varken,
 * vleeswaren, worst, de rest. Enkel om items samen te tonen; de categorie zelf blijft dezelfde.
 */
const MEAT_SUBGROUPS: Array<[RegExp, number]> = [
  [/\bkip|kippen|chicken|poulet|vol.?au.?vent|\bvide\b|drumstick|kippebout/, 0],
  [/kalkoen/, 1],
  [/worst|chipolata|merguez|knakwortel|frankfurter|pensen/, 5],
  [/gehakt|americain|hamburger|burger|carpaccio|loze vink|biefstuk|steak|\brund|stoofvlees|entrecote|balletjes|tartaar|kalfsvlees|kalfsgehakt/, 2],
  [/varken|\bspek|kotelet|ribbetje|schnitzel|filet pur|\blende|buikspek|gyros/, 3],
  [/\bham\b|parmaham|salami|fuet|chorizo|vleesje|prepare|pastrami|pate|boterham|serrano|coppa|bresaola|charcuterie/, 4],
];

function normalizeMeatName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Rang van de vleessoort (0 = kip … 5 = worst); 9 voor overig vlees of niet-vlees. */
export function meatSubgroupRank(name: string): number {
  const n = normalizeMeatName(name);
  for (const [re, rank] of MEAT_SUBGROUPS) if (re.test(n)) return rank;
  return 9;
}

/** Geldt voor categorieën met vlees («Vlees & Charcuterie» e.d.). */
export function isMeatCategory(categoryTitle: string): boolean {
  return /vlees|charcut/i.test(categoryTitle);
}

/**
 * Zet in een vleescategorie dezelfde soorten bij elkaar (alle kip samen, dan kalkoen, …).
 * Stabiel: binnen een soort blijft de bestaande volgorde behouden. Andere categorieën ongewijzigd.
 */
export function groupMeatSubtypes<T>(categoryTitle: string, items: T[], getName: (item: T) => string): T[] {
  if (!isMeatCategory(categoryTitle) || items.length < 2) return items;
  return items
    .map((item, index) => ({ item, index, rank: meatSubgroupRank(getName(item)) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.item);
}
