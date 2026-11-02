import { categorySubgroupKey, resolveItemCategoryFromName } from "@/lib/item-ingredient-category";

/**
 * Voorraadkast (bloem, olie, koekjes, chips…): rijen in `freezerItems` met dit `type`. Zo gelden dezelfde
 * rechten en velden als voor de diepvries; elke plek die diepvriesitems toont, slaat deze rijen over.
 */
export const PANTRY_ITEM_TYPE = "voorraadkast";

export function isPantryItem(row: { type?: unknown } | null | undefined): boolean {
  return row?.type === PANTRY_ITEM_TYPE;
}

export type PantryGroup = "bakken" | "olie" | "kruiden" | "snacks" | "overig";

/** Volgorde op de pagina. */
export const PANTRY_GROUPS: { key: PantryGroup; label: string }[] = [
  { key: "bakken", label: "Bakken en droogwaren" },
  { key: "olie", label: "Olie en sauzen" },
  { key: "kruiden", label: "Kruiden" },
  { key: "snacks", label: "Snacks" },
  { key: "overig", label: "Overig" },
];

/** Kruiden en specerijen, ook als de catalogus de naam elders plaatst (oregano, paprikapoeder bij de groenten). In de kast zijn ze gedroogd. */
const PANTRY_HERBS =
  /kruiden(?!boter|kaas)|specerij|(paprika|curry|knoflook|uien?|chili)poeder|kerrie|oregano|tijm|rozemarijn|basilicum|peterselie|dille|koriander|komijn|kurkuma|kaneel|nootmuskaat|kruidnagel|laurier|saffraan|\bpeper\b|\bzout\b/i;

/** Soort volgt uit de productnaam, zodat je niets hoeft te kiezen bij het toevoegen. */
export function pantryGroupOf(name: string): PantryGroup {
  if (/(olie|azijn)/i.test(name)) return "olie";
  if (PANTRY_HERBS.test(name)) return "kruiden";
  const category = resolveItemCategoryFromName(name);
  if (category === "Droogwaren & Bakproducten") return "bakken";
  if (category === "Conserven, Sauzen, Olie & Kruiden") return categorySubgroupKey(category, name) === "Kruiden & specerijen" ? "kruiden" : "olie";
  if (category === "Zoute Snacks" || category === "Snoep & Chocolade") return "snacks";
  return "overig";
}

/** Wat je gewoonlijk op voorraad hebt en niet in de koelkast of diepvries bewaart. */
const PANTRY_CATEGORIES = new Set([
  "Droogwaren & Bakproducten",
  "Conserven, Sauzen, Olie & Kruiden",
  "Beleg",
  "Zoute Snacks",
  "Snoep & Chocolade",
  "Warme Dranken",
  "Koude Dranken",
  "Alcoholische Dranken",
  "Huishouden & Schoonmaak",
  "Persoonlijke Verzorging",
  "Dierenvoeding",
]);

/** Gaat voor de categorie: expliciet vers of diepgevroren, en wat geen product is. */
const NEVER_PANTRY = /\bverse?\b|diepvries|planten water/;

/** Houdbaar in een categorie die verder vers is, of nog zonder categorie (de catalogus bevat ook kledij, papieren…). */
const SHELF_STABLE =
  /\bmelk\b|amandelmelk|havermelk|kokosdrink|fristi|bruiswater|aardappelen|krieltjes|(?<!pijp)ajuin|sjalot|\blook\b|af te bakken|piccolo|\bwraps\b|vol-?au-?vent koekje|boterwafel|\bcake\b|tomatensoep|creatine|douchegel|deodorant|vuilniszak|vochtige doekjes|wattenschijf|schuurspons|vaatdoek|zonnecreme|aftersun/;

/**
 * Hoort dit catalogusproduct in de voorraadkast? Soort volgt uit de categorie, zodat nieuwe producten
 * vanzelf goed staan: niets uit de diepvries, geen vers vlees, vis, zuivel, groenten of brood.
 */
export function isPantryProduct(name: string): boolean {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/_/g, " ");
  if (NEVER_PANTRY.test(n)) return false;
  return PANTRY_CATEGORIES.has(resolveItemCategoryFromName(name)) || SHELF_STABLE.test(n);
}

/** Nog één pak, fles… over: zelfde drempel als in de diepvries. */
export function isPantryLow(item: { packages?: number }): boolean {
  return item.packages === 1;
}

export function pantryStatsLabel(items: { packages?: number }[]): string {
  const low = items.filter(isPantryLow).length;
  const products = `${items.length} ${items.length === 1 ? "product" : "producten"}`;
  return low > 0 ? `${products} · ${low} bijna op` : products;
}
