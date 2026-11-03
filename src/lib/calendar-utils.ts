/**
 * Hulpfuncties voor de kalender-tab: datum-parsing, dag-mapping en aggregatie
 * van recepten + ingrediënten uit bestaande lijstdata.
 */

import { resolveItemCategoryFromName } from "@/lib/item-ingredient-category";
import {
  isTakeoutMealName,
  TAKEOUT_MEAL_PHOTO_URL,
} from "@/lib/takeout-meal";

export type CalendarMeal = {
  recipeGroupId: string;
  recipeName: string;
  /** Geparsed uit recipeGroupId (format: "recipe-<id>-<timestamp>"). */
  recipeId: string | null;
  photoUrl: string | null;
  ingredientCount: number;
  /** Gerecht uit de diepvries: geen ingrediënten om te kopen. */
  fromStock?: boolean;
  /** Afhaalgerecht: gepland eten zonder afvinkbare ingrediënten. */
  takeout?: boolean;
};

export type DayEntry = {
  date: Date;
  meals: CalendarMeal[];
  /** Items in een dagnaam-sectie zonder recipeGroupId. */
  looseIngredients: { name: string; quantity: string; photoUrl?: string | null; fromStock?: boolean }[];
};

export function dayEntryHasContent(entry: DayEntry | undefined): boolean {
  if (!entry) return false;
  return entry.meals.length > 0 || entry.looseIngredients.length > 0;
}

const CALENDAR_PROTEIN_CATEGORIES = new Set(["Vlees & Charcuterie", "Vis & Zeevruchten"]);
const CALENDAR_PRODUCE_CATEGORY = "Groenten & Fruit";
/** Zetmeel: aardappelen (en afgeleiden), rijst, pasta, noedels, granen. «Rijstpapier» telt niet. */
const STARCH_NAME_PATTERN =
  /\b(?:\w*aardappel\w*|patat\w*|krielt\w*|friet\w*|kroket\w*|puree|gnocchi|rijst|basmati\w*|risotto\w*|pasta\w*|spaghetti|penne|macaroni|fusilli|tagliatelle|lasagne\w*|farfalle|tortellini|ravioli|noedel\w*|mie|udon|couscous|bulgur|quinoa|orzo|polenta)\b/i;
/** Eiwit buiten vlees/vis: vegetarische hoofdcomponent. */
const VEGGIE_PROTEIN_PATTERN = /\b(?:tofu|tempeh|seitan|eieren|ei|falafel|quorn|kikkererwten|linzen)\b/i;
/** Fruit telt niet als «groente» op het bord. */
const FRUIT_NAME_PATTERN =
  /\b(?:appel\w*|banan\w*|mandarijn\w*|clementine\w*|sinaas\w*|kiwi\w*|peer|peren|druiven|aardbei\w*|framboz\w*|bosbes\w*|blauwe bessen|citroen\w*|limoen\w*|meloen\w*|ananas|mango\w*|perzik\w*|nectarine\w*|pruim\w*|kers\w*|abrikoz\w*|granaatappel\w*)\b/i;

/** «Soepgroenten» en «soepballetjes» zijn geen soep; bouillon evenmin. */
const SOUP_NAME_PATTERN = /soep(?:je)?\b|velout/i;
export const isSoupName = (name: string) => SOUP_NAME_PATTERN.test(name);
const isRucolaSoup = (name: string) => /rucola/i.test(name) && isSoupName(name);

/** Maaltijd uit losse componenten: aardappelgerecht als hoofdgerecht, vlees en groenten erbij. */
export type DishRole = "potato" | "meat" | "vegetable";
const POTATO_DISH_PATTERN = /aardappel|puree|purée|stoemp|mousseline|hutsepot|kroket|gratin|krielt|patat|friet/i;
const MEAT_DISH_PATTERN =
  /schnitzel|balletjes|gehakt|kip|kalkoen|vlees|steak|burger|worst|varken|rund|\blams?\b|\bvis\b|vissticks|zalm|kabeljauw|scampi|garna|stoof|stoverij|goulash|blanquette|vol-au-vent/i;
const VEGETABLE_DISH_PATTERN = /kool|groent|wortel|erwt|boontjes|spruit|ratatouille|appelmoes/i;

const isStarch = (name: string) => STARCH_NAME_PATTERN.test(name);
const isProtein = (name: string) =>
  CALENDAR_PROTEIN_CATEGORIES.has(resolveItemCategoryFromName(name)) || VEGGIE_PROTEIN_PATTERN.test(name);
const isVegetable = (name: string) =>
  !isStarch(name) &&
  !FRUIT_NAME_PATTERN.test(name) &&
  resolveItemCategoryFromName(name) === CALENDAR_PRODUCE_CATEGORY;

/** Volledig gerecht (curry, lasagne…): altijd hoofdgerecht, ook als er vlees in de naam staat. */
const COMPLETE_DISH_PATTERN =
  /curry|massala|masala|tikka|korma|tajine|chili|lasagne|spaghetti|pasta|risotto|paella|nasi|bami|wok|ovenschotel|stoofpot|moussaka|quiche|pizza|enchilada|burrito|biryani|dahl|dal\b|pad thai|ramen/i;
/** Altijd bijgerecht: brood, rijst, saus, salade… ook zonder rol op het bord. */
const SIDE_ONLY_PATTERN = /naan|brood|pita|wrap|tortilla|rijst|couscous|salade|saus|dip|raita|chutney|frietjes/i;

/** Hoort bij het bord als volwaardig hoofdgerecht (geen soep, geen afhaal, geen bijgerecht). */
export function isCompleteMainDish(name: string): boolean {
  if (isSoupName(name) || SIDE_ONLY_PATTERN.test(name)) return false;
  return COMPLETE_DISH_PATTERN.test(name) || dishRole(name) === null;
}

/** Rol van een gerecht op het bord; soep en bouillon staan daarbuiten. */
export function dishRole(name: string): DishRole | null {
  if (isSoupName(name) || /bouillon/i.test(name)) return null;
  if (POTATO_DISH_PATTERN.test(name)) return "potato";
  if (MEAT_DISH_PATTERN.test(name) || isProtein(name)) return "meat";
  if (VEGETABLE_DISH_PATTERN.test(name) || isVegetable(name)) return "vegetable";
  return null;
}

/**
 * Kiest maximaal drie representatieve losse items voor een kalendertegel, zoals een bord:
 * één zetmeel (aardappelen, rijst, pasta…), één groente en één vlees/vis (of tofu, eieren…).
 * Ontbrekende plaatsen worden stabiel aangevuld uit de oorspronkelijke volgorde.
 */
export function selectCalendarPreviewItems<T extends { name: string }>(
  items: readonly T[],
  limit = 3,
): T[] {
  if (limit <= 0) return [];

  const selectedIndexes = new Set<number>();
  const selected: T[] = [];
  const takeFirst = (matches: (item: T) => boolean) => {
    const index = items.findIndex(
      (item, itemIndex) => !selectedIndexes.has(itemIndex) && matches(item),
    );
    if (index === -1 || selected.length >= limit) return;
    selectedIndexes.add(index);
    selected.push(items[index]);
  };

  takeFirst((item) => isStarch(item.name));
  takeFirst((item) => isVegetable(item.name));
  takeFirst((item) => isProtein(item.name));

  for (let index = 0; index < items.length && selected.length < limit; index++) {
    if (selectedIndexes.has(index)) continue;
    selectedIndexes.add(index);
    selected.push(items[index]);
  }

  return selected;
}

/** Parse Dutch locale date string "D-M-YYYY" (of "DD-MM-YYYY") naar een Date. */
export function parseDutchDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year < 2020 || year > 2100) return null;
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  return date;
}

/** Geeft de maandag terug van de week waarin `date` valt. */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Zo, 1=Ma, ..., 6=Za
  const diff = (day + 6) % 7; // 0=Ma, 1=Di, ..., 6=Zo
  d.setDate(d.getDate() - diff);
  return d;
}

/** Dag-offset t.o.v. maandag (0=Ma … 6=Zo). "Algemeen" → null (overgeslagen). */
export function dutchDayToOffset(section: string): number | null {
  switch (section) {
    case "Maandag":   return 0;
    case "Dinsdag":   return 1;
    case "Woensdag":  return 2;
    case "Donderdag": return 3;
    case "Vrijdag":   return 4;
    case "Zaterdag":  return 5;
    case "Zondag":    return 6;
    default:          return null; // "Algemeen" of onbekend
  }
}

/** Voeg `days` dagen toe aan `date` (geeft nieuwe Date terug). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Berekent de absolute datum voor een dagnaam-sectie op het moment van aanroep.
 * Startend van de maandag van de huidige week + offset; als die dag al voorbij is,
 * wordt volgende week gebruikt. Retourneert null voor "Algemeen" e.d.
 * Gebruik deze functie bij het OPSLAAN van een item, niet bij weergave.
 */
export function computeSectionAbsoluteDate(sectionTitle: string): string | null {
  const offset = dutchDayToOffset(sectionTitle);
  if (offset === null) return null;
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const monday = getMondayOfWeek(todayMidnight);
  let date = addDays(monday, offset);
  if (date < todayMidnight) date = addDays(date, 7);
  return toIsoDate(date);
}

/** ISO-datumstring "YYYY-MM-DD" (lokale tijd, zonder UTC-shift). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse recipeId uit recipeGroupId ("recipe-<uuid>-<13-cijfer-timestamp>"). */
function parseRecipeId(groupId: string): string | null {
  const match = groupId.match(/^recipe-(.+)-(\d{10,15})$/);
  return match ? match[1] : null;
}

type AnyItem = {
  name: string;
  quantity: string;
  section?: string | null;
  /** Absolute datum "YYYY-MM-DD", opgeslagen bij aanmaken. Ontbreekt op oudere items. */
  itemDate?: string | null;
  recipeGroupId?: string | null;
  recipeName?: string | null;
  fromStock?: boolean | null;
  stockPhotoUrl?: string | null;
  /** "pantry" = uit de voorraadkast (geen diepvriesgerecht). */
  stockSource?: string | null;
};

type AnyList = {
  date: string;
  isMasterTemplate?: boolean | null;
  items?: AnyItem[] | null;
};

type AnyRecipe = {
  id: string;
  name?: string;
  photoUrl?: string | null;
};

const stockBaseName = (name: string) => name.replace(/\s*\(diepvries\)$/, "").trim();
const isStockLooseItem = (item: DayEntry["looseIngredients"][number]) =>
  item.fromStock === true || item.name.endsWith(" (diepvries)");

/** Losse diepvriesitems worden gerechten, zodat ze een eigen plaats op de dagtegel krijgen. */
function promoteLooseToMeals(
  iso: string,
  entry: DayEntry,
  loose: DayEntry["looseIngredients"],
  recipeByName: Map<string, AnyRecipe>,
) {
  for (const item of loose) {
    const name = stockBaseName(item.name);
    const recipe = recipeByName.get(name.toLowerCase()) ?? null;
    entry.meals.push({
      recipeGroupId: `stock-${iso}-${name}`,
      recipeName: name,
      recipeId: recipe?.id ?? null,
      photoUrl: item.photoUrl ?? recipe?.photoUrl ?? null,
      ingredientCount: 0,
      fromStock: true,
    });
  }
  entry.looseIngredients = entry.looseIngredients.filter((i) => !loose.includes(i));
}

/**
 * Meerdere soepen op één dag: de eerste is het hoofdgerecht, de volgende het secundaire gerecht;
 * rucolasoep is altijd secundair. Diepvriessoepen zonder receptgroep worden daarvoor gerechten.
 */
function arrangeDaySoups(iso: string, entry: DayEntry, recipeByName: Map<string, AnyRecipe>) {
  const looseSoups = entry.looseIngredients.filter((i) => isStockLooseItem(i) && isSoupName(i.name));
  if (entry.meals.filter((m) => isSoupName(m.recipeName)).length + looseSoups.length < 2) return;
  promoteLooseToMeals(iso, entry, looseSoups, recipeByName);

  const rucolaIndex = entry.meals.findIndex((m) => isRucolaSoup(m.recipeName));
  const hasOtherSoup = entry.meals.some((m) => isSoupName(m.recipeName) && !isRucolaSoup(m.recipeName));
  if (rucolaIndex < 0 || !hasOtherSoup) return;
  const [rucola] = entry.meals.splice(rucolaIndex, 1);
  const primaryIndex = entry.meals.findIndex((m) => isSoupName(m.recipeName) && !isRucolaSoup(m.recipeName));
  entry.meals.splice(primaryIndex + 1, 0, rucola);
}

/** Aardappelgerecht met vlees of groenten erbij: de aardappelen zijn hoofdgerecht, daarna vlees, dan groenten. */
function arrangeDaySideDishes(iso: string, entry: DayEntry, recipeByName: Map<string, AnyRecipe>) {
  const looseDishes = entry.looseIngredients.filter((i) => isStockLooseItem(i) && dishRole(stockBaseName(i.name)));
  const roles = [
    ...entry.meals.map((m) => (m.takeout ? null : dishRole(m.recipeName))),
    ...looseDishes.map((i) => dishRole(stockBaseName(i.name))),
  ];
  if (!roles.includes("potato") || !(roles.includes("meat") || roles.includes("vegetable"))) return;
  promoteLooseToMeals(iso, entry, looseDishes, recipeByName);

  const rank = (m: CalendarMeal) => {
    const role = m.takeout ? null : dishRole(m.recipeName);
    return role === "potato" ? 0 : role === "meat" ? 1 : role === "vegetable" ? 2 : 3;
  };
  entry.meals.sort((a, b) => rank(a) - rank(b));
}

/**
 * Een volwaardig hoofdgerecht (tikka massala, lasagne…) staat altijd vooraan; puree, groenten en
 * andere gerechten worden dan bijgerechten.
 */
function arrangeMainDish(entry: DayEntry) {
  // Een soepdag blijft een soepdag: alleen een bijgerecht vooraan (puree, groenten, naan…) maakt plaats.
  const first = entry.meals[0];
  if (!first || first.takeout || isSoupName(first.recipeName) || isCompleteMainDish(first.recipeName)) return;
  const index = entry.meals.findIndex((m) => !m.takeout && isCompleteMainDish(m.recipeName));
  if (index <= 0) return;
  const [main] = entry.meals.splice(index, 1);
  entry.meals.unshift(main);
}

/**
 * Bouwt een Map<isoDate, DayEntry> op basis van alle lijsten + recepten.
 * Master-template lijsten worden overgeslagen.
 */
export function buildCalendarEntries(
  lists: AnyList[],
  recipes: AnyRecipe[],
): Map<string, DayEntry> {
  const recipeMap = new Map<string, AnyRecipe>(recipes.map((r) => [r.id, r]));
  const recipeByName = new Map<string, AnyRecipe>();
  for (const r of recipes) {
    if (r.name) recipeByName.set(r.name.trim().toLowerCase(), r);
  }
  const result = new Map<string, DayEntry>();

  for (const list of lists) {
    if (list.isMasterTemplate) continue;

    const listDate = parseDutchDate(list.date);
    if (!listDate) continue;
    const monday = getMondayOfWeek(listDate);

    const listItems = list.items ?? [];
    for (let itemIndex = 0; itemIndex < listItems.length; itemIndex++) {
      const item = listItems[itemIndex];
      const offset = dutchDayToOffset(item.section ?? "");
      if (offset === null) continue;

      let iso: string;
      let itemDate: Date;
      if (item.itemDate) {
        // Absolute datum opgeslagen bij aanmaken — nooit herschikken.
        iso = item.itemDate;
        const [y, m, d] = item.itemDate.split("-").map(Number);
        itemDate = new Date(y, m - 1, d);
      } else {
        // Legacy-items: bereken vanuit lijstdatum. Als de berekende dag vóór de
        // aanmaakdatum van de lijst valt, schuif dan één week op (stabiel anker).
        itemDate = addDays(monday, offset);
        if (itemDate < listDate) itemDate = addDays(itemDate, 7);
        iso = toIsoDate(itemDate);
      }

      if (!result.has(iso)) {
        result.set(iso, { date: itemDate, meals: [], looseIngredients: [] });
      }
      const entry = result.get(iso)!;

      if (isTakeoutMealName(item.name)) {
        entry.meals.push({
          recipeGroupId: `takeout-${iso}-${itemIndex}`,
          recipeName: item.name,
          recipeId: null,
          photoUrl: TAKEOUT_MEAL_PHOTO_URL,
          ingredientCount: 0,
          takeout: true,
        });
      } else if (item.recipeGroupId) {
        let meal = entry.meals.find((m) => m.recipeGroupId === item.recipeGroupId);
        if (!meal) {
          const recipeId = parseRecipeId(item.recipeGroupId);
          const recipe =
            (recipeId ? recipeMap.get(recipeId) : null) ??
            (item.recipeName ? recipeByName.get(item.recipeName.trim().toLowerCase()) : null) ??
            null;
          meal = {
            recipeGroupId: item.recipeGroupId,
            recipeName: item.recipeName ?? "Recept",
            recipeId: recipeId ?? null,
            /* Eerst de huidige receptfoto (transparant); de diepvriesfoto is een oude kopie van toen. */
            photoUrl: recipe?.photoUrl ?? item.stockPhotoUrl ?? null,
            ingredientCount: 0,
            fromStock: item.fromStock === true || undefined,
          };
          entry.meals.push(meal);
        }
        if (item.fromStock) {
          meal.fromStock = true;
          if (!meal.photoUrl && item.stockPhotoUrl) meal.photoUrl = item.stockPhotoUrl;
        } else {
          meal.ingredientCount++;
        }
      } else {
        let loosePhotoUrl: string | null = null;
        const baseName = item.name.replace(/\s*\(diepvries\)$/, "").trim().toLowerCase();
        const recipePhoto = item.fromStock || item.name.endsWith(" (diepvries)") ? recipeByName.get(baseName)?.photoUrl ?? null : null;
        if (recipePhoto) {
          loosePhotoUrl = recipePhoto;
        } else if (item.fromStock && item.stockPhotoUrl) {
          loosePhotoUrl = item.stockPhotoUrl;
        }
        entry.looseIngredients.push({
          name: item.name,
          quantity: item.quantity,
          photoUrl: loosePhotoUrl,
          // Voorraadkast (kruiden, bouillon…) is geen diepvriesgerecht: geen sneeuwvlok op de dag.
          fromStock: (item.fromStock === true && item.stockSource !== "pantry") || undefined,
        });
      }
    }
  }

  result.forEach((entry, iso) => {
    arrangeDaySoups(iso, entry, recipeByName);
    arrangeDaySideDishes(iso, entry, recipeByName);
    arrangeMainDish(entry);
  });

  return result;
}
