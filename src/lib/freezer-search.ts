/**
 * Diepvries: zoeken én toevoegen in één veld (canvas «Zoeken én toevoegen in één veld · voorstel»).
 * Pure helpers voor de pagina: voorraadlabels, de meldingstekst en de zoekresultaten per groep.
 */

export interface FreezerEntry {
  id: string;
  type: string;
  name: string;
  quantityPerPackage: number;
  unit: string;
  packages: number;
  ownerId?: string;
  recipeId?: string;
  recipePhotoUrl?: string;
  recipePersons?: number;
  order?: number;
}

export interface FreezerRecipeOption {
  id: string;
  name: string;
  photoUrl?: string | null;
  persons?: number | null;
}

/** Eenheden voor een product; g/kg = gewicht per pakket, de rest = aantal pakketten. */
export const FREEZER_PRODUCT_UNITS = ["stuk", "zak", "pak", "g", "kg"] as const;
/** Voorraadkast: dezelfde, plus fles en pot (olie, sauzen, confituur). */
export const PANTRY_PRODUCT_UNITS = ["stuk", "zak", "pak", "fles", "pot", "g", "kg"] as const;
export const FREEZER_WEIGHT_UNITS = new Set<string>(["g", "kg"]);
const PLURALS: Record<string, string> = { portie: "porties", stuk: "stuks", zak: "zakken", pak: "pakken", fles: "flessen", pot: "potten" };

/** Hoeveel er ligt: «3 porties», «1 zak», «2 × 500 g». */
export function freezerStockLabel(item: Pick<FreezerEntry, "type" | "unit" | "packages" | "quantityPerPackage">): string {
  const count = item.packages;
  if (item.type === "gerecht") return `${count} ${count === 1 ? "portie" : "porties"}`;
  if (FREEZER_WEIGHT_UNITS.has(item.unit)) {
    const weight = `${item.quantityPerPackage} ${item.unit}`;
    return count === 1 ? weight : `${count} × ${weight}`;
  }
  return `${count} ${count === 1 ? item.unit : (PLURALS[item.unit] ?? item.unit)}`;
}

/** Velden van een product bij een andere eenheid: gewicht = één pakket van 500 g / 1 kg. */
export function freezerUnitPatch(item: Pick<FreezerEntry, "packages">, unit: string) {
  const weight = FREEZER_WEIGHT_UNITS.has(unit);
  return { unit, quantityPerPackage: unit === "g" ? 500 : 1, packages: weight ? 1 : item.packages };
}

/** Eén melding per item; `before: null` = net toegevoegd, `after: null` = weggehaald. */
export interface FreezerUndo {
  id: string;
  before: FreezerEntry | null;
  after: FreezerEntry | null;
}

/** `place`: «diepvries» of «voorraadkast», voor «in je …» / «uit de …». */
export function freezerUndoLines({ before, after }: FreezerUndo, place: "diepvries" | "voorraadkast" = "diepvries"): [string, string] {
  if (!after) return [`${before?.name ?? ""} verwijderd`, `uit de ${place}`];
  if (!before) return [`${after.name} toegevoegd`, `${freezerStockLabel(after)} in je ${place}`];
  const delta = after.packages - before.packages;
  if (delta === 0) return [`${after.name} aangepast`, `nu ${freezerStockLabel(after)}`];
  return [`${after.name} ${delta > 0 ? "+" : "−"}${Math.abs(delta)}`, `nog ${freezerStockLabel(after)}`];
}

/** Volgende meldingstoestand na een wijziging aan `item` (eerdere wijzigingen aan hetzelfde item tellen mee). */
export function nextFreezerUndo(current: FreezerUndo | null, item: FreezerEntry, after: FreezerEntry | null): FreezerUndo | null {
  const before = current?.id === item.id ? current.before : item;
  if (!before && !after) return null;
  if (before && after && before.packages === after.packages && before.unit === after.unit && before.quantityPerPackage === after.quantityPerPackage) return null;
  return { id: item.id, before, after };
}

/** Gerechten in logische groepen op de pagina; volgorde = volgorde op het scherm (soepen bovenaan). */
export type FreezerDishGroup = "soep" | "bijgerecht" | "saus" | "pasta" | "vlees" | "overig";
export const FREEZER_DISH_GROUPS: { key: FreezerDishGroup; label: string }[] = [
  { key: "soep", label: "Soepen" },
  { key: "bijgerecht", label: "Bijgerechten" },
  { key: "saus", label: "Sauzen en stoofpotjes" },
  { key: "pasta", label: "Pasta, rijst en noedels" },
  { key: "vlees", label: "Vlees en vis" },
  { key: "overig", label: "Andere gerechten" },
];

/** Groep volgt uit de naam; de eerste treffer wint, dus «Noedelsoep» is een soep en geen noedels. */
export function freezerDishGroupOf(name: string): FreezerDishGroup {
  const n = name.toLowerCase();
  if (/soep|bouillon|velout/.test(n)) return "soep";
  if (/puree|purée|stoemp|mousseline|hutsepot|kroket|gratin|aardappel|frietjes|rode kool|appelmoes|groenten|wortelen|worteltjes|erwt|boontjes|spruitjes|ratatouille/.test(n)) return "bijgerecht";
  if (/saus|bolognese|ragout|rag[uù]|stoof|stoverij|goulash|curry|chili|blanquette|vol-au-vent|dahl|dal\b/.test(n)) return "saus";
  if (/pasta|lasagne|spaghetti|macaroni|penne|tagliatelle|noedel|nasi|bami|rijst|risotto|couscous/.test(n)) return "pasta";
  if (/schnitzel|balletjes|gehakt|kip|kalkoen|vlees|steak|burger|worst|varken|rund|lams?|vis\b|vissticks|zalm|kabeljauw|scampi|garnaal/.test(n)) return "vlees";
  return "overig";
}

export type FreezerSearchFilter = "alles" | "gerecht" | "product";

export interface FreezerSearchResult {
  /** «In je diepvries»: wat er al lag en bij de zoekterm past. */
  inFreezer: FreezerEntry[];
  /** «Recepten»: `stock` = net toegevoegd in deze zoekbeurt (stepper in plaats van plus). */
  recipes: { recipe: FreezerRecipeOption; stock: FreezerEntry | null }[];
  /** «Producten»: idem; vrije namen («so» als nieuw product) staan er ook bij zodra ze toegevoegd zijn. */
  products: { name: string; stock: FreezerEntry | null }[];
  /** Naam voor «… als nieuw product», of null als die al in de lijst staat. */
  createName: string | null;
}

const key = (value: string) => value.trim().toLowerCase();

/**
 * Bouwt de drie groepen. Wat in deze zoekbeurt toegevoegd is (`addedIds`) blijft op zijn plaats staan
 * met een stepper, zodat de lijst niet verspringt; wat er al lag, staat enkel onder «In je diepvries».
 */
export function buildFreezerSearch({
  query,
  items,
  recipes,
  productNames,
  addedIds,
  filter,
}: {
  query: string;
  items: FreezerEntry[];
  /** Recepten die bij de zoekterm passen (al gesorteerd). */
  recipes: FreezerRecipeOption[];
  /** Productnamen uit de catalogus die bij de zoekterm passen. */
  productNames: string[];
  addedIds: ReadonlySet<string>;
  filter: FreezerSearchFilter;
}): FreezerSearchResult {
  const q = key(query);
  const showDishes = filter !== "product";
  const showProducts = filter !== "gerecht";
  const dishes = items.filter((i) => i.type === "gerecht");
  const goods = items.filter((i) => i.type !== "gerecht");

  const inFreezer = items.filter(
    (i) => !addedIds.has(i.id) && (i.type === "gerecht" ? showDishes : showProducts) && key(i.name).includes(q),
  );
  const listed = new Set(inFreezer.map((i) => i.id));
  const added = (list: FreezerEntry[]) => list.filter((i) => addedIds.has(i.id));

  const recipeRows: FreezerSearchResult["recipes"] = [];
  if (showDishes) {
    const seen = new Set<string>();
    for (const recipe of recipes) {
      const stock = dishes.find((i) => (i.recipeId ? i.recipeId === recipe.id : key(i.name) === key(recipe.name))) ?? null;
      if (stock && listed.has(stock.id)) continue;
      if (stock) seen.add(stock.id);
      recipeRows.push({ recipe, stock });
    }
    // Toegevoegd en daarna weggezocht: blijft bovenaan staan.
    const extra = added(dishes)
      .filter((i) => !seen.has(i.id))
      .map((i) => ({ recipe: { id: i.recipeId ?? i.id, name: i.name, photoUrl: i.recipePhotoUrl, persons: i.recipePersons }, stock: i }));
    recipeRows.unshift(...extra);
  }

  const productRows: FreezerSearchResult["products"] = [];
  if (showProducts) {
    const seen = new Set<string>();
    for (const name of productNames) {
      const stock = goods.find((i) => key(i.name) === key(name)) ?? null;
      if (stock && listed.has(stock.id)) continue;
      if (stock) seen.add(stock.id);
      productRows.push({ name, stock });
    }
    const extra = added(goods)
      .filter((i) => !seen.has(i.id))
      .map((i) => ({ name: i.name, stock: i }));
    productRows.unshift(...extra);
  }

  const typed = query.trim();
  const taken =
    items.some((i) => i.type !== "gerecht" && key(i.name) === q) || productRows.some((p) => key(p.name) === q);
  return { inFreezer, recipes: recipeRows, products: productRows, createName: showProducts && typed && !taken ? typed : null };
}
