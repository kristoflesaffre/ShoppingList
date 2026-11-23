/**
 * Eten van één dag wijzigen vanuit de kalender (canvas «Eten bewerken in de kalender»,
 * https://claude.ai/artifact/GU4xKr3hQxLYK36SU1Cqhm). Het eten op de kalender komt uit de dag-secties van de
 * lijstjes (`buildCalendarEntries`); hier dezelfde items, maar mét hun id en lijstje, zodat het blad «Eten van …»
 * ze kan weghalen, verplaatsen of hun aantal kan aanpassen. Wat je hier wijzigt, staat dus meteen op het lijstje.
 */
import { addDays, dutchDayToOffset, getMondayOfWeek, parseDutchDate, toIsoDate } from "@/lib/calendar-utils";
import { isTakeoutMealName } from "@/lib/takeout-meal";

export type DayItem = {
  id: string;
  listId: string;
  name: string;
  quantity: string;
  checked: boolean;
  order: number;
  recipeGroupId: string | null;
  recipeName: string | null;
  fromStock: boolean;
  stockPhotoUrl: string | null;
  pantry: boolean;
};

export type DayMeal = {
  /** recipeGroupId, of `item-<id>` voor een los diepvries- of afhaalgerecht. */
  key: string;
  kind: "recipe" | "stock" | "takeout";
  name: string;
  recipeId: string | null;
  photoUrl: string | null;
  /** Alle items van dit gerecht (wat weg moet bij verwijderen of mee moet bij verplaatsen). */
  items: DayItem[];
  /** De ingrediënten om te kopen (zonder het diepvriesgerecht zelf). */
  ingredients: DayItem[];
};

export type DayModel = { meals: DayMeal[]; loose: DayItem[] };

type RawItem = {
  id?: string;
  name?: string | null;
  quantity?: string | null;
  checked?: boolean | null;
  order?: number | null;
  section?: string | null;
  itemDate?: string | null;
  recipeGroupId?: string | null;
  recipeName?: string | null;
  fromStock?: boolean | null;
  stockPhotoUrl?: string | null;
  stockSource?: string | null;
};
type RawList = { id?: string; date: string; isMasterTemplate?: boolean | null; items?: RawItem[] | null };
type RawRecipe = { id: string; name?: string; photoUrl?: string | null };

export const DAY_SECTIONS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"] as const;

/** Dagnaam-sectie van een datum («Maandag» … «Zondag»). */
export function sectionForIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return DAY_SECTIONS[(day + 6) % 7];
}

/** De datum van een item op de kalender: dezelfde regels als `buildCalendarEntries`. */
export function itemIsoDate(list: RawList, item: RawItem): string | null {
  const offset = dutchDayToOffset(item.section ?? "");
  if (offset === null) return null;
  if (item.itemDate) return item.itemDate;
  const listDate = parseDutchDate(list.date);
  if (!listDate) return null;
  let date = addDays(getMondayOfWeek(listDate), offset);
  if (date < listDate) date = addDays(date, 7);
  return toIsoDate(date);
}

function parseRecipeId(groupId: string): string | null {
  const match = groupId.match(/^recipe-(.+)-(\d{10,15})$/);
  return match ? match[1] : null;
}

const stockBase = (name: string) => name.replace(/\s*\(diepvries\)$/, "").trim();

function toDayItem(listId: string, item: RawItem): DayItem {
  return {
    id: item.id ?? "",
    listId,
    name: item.name ?? "",
    quantity: item.quantity ?? "",
    checked: item.checked === true,
    order: typeof item.order === "number" ? item.order : 0,
    recipeGroupId: item.recipeGroupId || null,
    recipeName: item.recipeName || null,
    fromStock: item.fromStock === true,
    stockPhotoUrl: item.stockPhotoUrl || null,
    pantry: item.stockSource === "pantry",
  };
}

/** Alles wat op een dag gepland staat, per gerecht en los, met de items zelf. */
export function dayModel(lists: RawList[], recipes: RawRecipe[], iso: string): DayModel {
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const recipeByName = new Map(recipes.filter((r) => r.name).map((r) => [r.name!.trim().toLowerCase(), r]));
  const meals: DayMeal[] = [];
  const loose: DayItem[] = [];
  for (const list of lists) {
    if (list.isMasterTemplate || !list.id) continue;
    for (const raw of list.items ?? []) {
      if (!raw.id || itemIsoDate(list, raw) !== iso) continue;
      const item = toDayItem(list.id, raw);
      if (isTakeoutMealName(item.name)) {
        meals.push({ key: `item-${item.id}`, kind: "takeout", name: item.name, recipeId: null, photoUrl: null, items: [item], ingredients: [] });
      } else if (item.recipeGroupId) {
        let meal = meals.find((m) => m.key === item.recipeGroupId);
        if (!meal) {
          const recipeId = parseRecipeId(item.recipeGroupId);
          const recipe = (recipeId ? recipeById.get(recipeId) : undefined) ?? (item.recipeName ? recipeByName.get(item.recipeName.trim().toLowerCase()) : undefined);
          meal = {
            key: item.recipeGroupId,
            kind: "recipe",
            name: item.recipeName ?? "Recept",
            recipeId: recipeId ?? recipe?.id ?? null,
            photoUrl: recipe?.photoUrl ?? item.stockPhotoUrl ?? null,
            items: [],
            ingredients: [],
          };
          meals.push(meal);
        }
        meal.items.push(item);
        if (item.fromStock) meal.kind = "stock";
        else meal.ingredients.push(item);
      } else if (item.fromStock && !item.pantry) {
        const name = stockBase(item.name);
        const recipe = recipeByName.get(name.toLowerCase());
        meals.push({ key: `item-${item.id}`, kind: "stock", name, recipeId: recipe?.id ?? null, photoUrl: recipe?.photoUrl ?? item.stockPhotoUrl, items: [item], ingredients: [] });
      } else {
        loose.push(item);
      }
    }
  }
  // Recepten met iets om te kopen eerst, dan diepvries en afhalen (zoals «Gerechten» en «Erbij» in het blad).
  const rank = (m: DayMeal) => (m.kind === "recipe" ? 0 : 1);
  meals.sort((a, b) => rank(a) - rank(b));
  return { meals, loose };
}

/**
 * Het lijstje waar nieuw eten op komt: het lijstje dat al eten voor de komende dagen heeft (het meest), anders het
 * meest recente lijstje met dag-secties, anders het meest recente lijstje.
 */
export function planningListId(lists: RawList[], todayIso: string): string | null {
  const week = new Set(Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(isoToDate(todayIso), i))));
  let best: { id: string; count: number } | null = null;
  let latestWithDays: { id: string; time: number } | null = null;
  let latest: { id: string; time: number } | null = null;
  for (const list of lists) {
    if (list.isMasterTemplate || !list.id) continue;
    const time = parseDutchDate(list.date)?.getTime() ?? 0;
    if (!latest || time > latest.time) latest = { id: list.id, time };
    let count = 0;
    let hasDays = false;
    for (const item of list.items ?? []) {
      const iso = itemIsoDate(list, item);
      if (!iso) continue;
      hasDays = true;
      if (week.has(iso)) count++;
    }
    if (count > 0 && (!best || count > best.count)) best = { id: list.id, count };
    if (hasDays && (!latestWithDays || time > latestWithDays.time)) latestWithDays = { id: list.id, time };
  }
  return best?.id ?? latestWithDays?.id ?? latest?.id ?? null;
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** De dagen van de weekstrook: vandaag en de zes dagen erna, plus de geopende dag als die erbuiten valt. */
export function stripDays(todayIso: string, openIso: string): string[] {
  const days = Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(isoToDate(todayIso), i)));
  if (!days.includes(openIso)) return openIso < todayIso ? [openIso, ...days.slice(0, 6)] : [...days.slice(0, 6), openIso];
  return days;
}

/**
 * Een hoeveelheid één stap groter of kleiner: «2 stuks» → «3 stuks», «1 pak» → «2 pak», «500 g» blijft (geen
 * stap). Nooit onder 1. Geen getal vooraan of een gewicht → null (dan geen stepper).
 */
export function stepQuantity(quantity: string, delta: number): string | null {
  const match = quantity.trim().match(/^(\d+)(?:\s+(.*))?$/);
  if (!match) return null;
  const unit = (match[2] ?? "").trim();
  if (/^(g|gr|gram|kg|ml|cl|l|liter)$/i.test(unit)) return null;
  const next = Math.max(1, Number(match[1]) + delta);
  const nextUnit = unit === "stuk" && next > 1 ? "stuks" : unit === "stuks" && next === 1 ? "stuk" : unit;
  return nextUnit ? `${next} ${nextUnit}` : String(next);
}
