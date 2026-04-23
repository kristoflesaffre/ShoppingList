/**
 * Hulpfuncties voor de kalender-tab: datum-parsing, dag-mapping en aggregatie
 * van recepten + ingrediënten uit bestaande lijstdata.
 */

export type CalendarMeal = {
  recipeGroupId: string;
  recipeName: string;
  /** Geparsed uit recipeGroupId (format: "recipe-<id>-<timestamp>"). */
  recipeId: string | null;
  photoUrl: string | null;
  ingredientCount: number;
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
  recipeGroupId?: string | null;
  recipeName?: string | null;
  fromStock?: boolean | null;
  stockPhotoUrl?: string | null;
};

type AnyList = {
  date: string;
  isMasterTemplate?: boolean | null;
  items?: AnyItem[] | null;
};

type AnyRecipe = {
  id: string;
  photoUrl?: string | null;
};

/**
 * Bouwt een Map<isoDate, DayEntry> op basis van alle lijsten + recepten.
 * Master-template lijsten worden overgeslagen.
 */
export function buildCalendarEntries(
  lists: AnyList[],
  recipes: AnyRecipe[],
): Map<string, DayEntry> {
  const recipeMap = new Map<string, AnyRecipe>(recipes.map((r) => [r.id, r]));
  const result = new Map<string, DayEntry>();

  for (const list of lists) {
    if (list.isMasterTemplate) continue;

    const listDate = parseDutchDate(list.date);
    if (!listDate) continue;
    const monday = getMondayOfWeek(listDate);

    for (const item of list.items ?? []) {
      const offset = dutchDayToOffset(item.section ?? "");
      if (offset === null) continue;

      let itemDate = addDays(monday, offset);
      // Nooit in het verleden plannen voor de HUIDIGE week: als de user vandaag
      // items toevoegt aan "Woensdag" maar woensdag al voorbij is, verschuif naar
      // volgende week. Items uit VORIGE weken blijven op hun originele datum.
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const currentMonday = getMondayOfWeek(todayMidnight);
      if (
        monday.getTime() === currentMonday.getTime() &&
        itemDate < todayMidnight
      ) {
        itemDate = addDays(itemDate, 7);
      }
      const iso = toIsoDate(itemDate);

      if (!result.has(iso)) {
        result.set(iso, { date: itemDate, meals: [], looseIngredients: [] });
      }
      const entry = result.get(iso)!;

      if (item.recipeGroupId) {
        let meal = entry.meals.find((m) => m.recipeGroupId === item.recipeGroupId);
        if (!meal) {
          const recipeId = parseRecipeId(item.recipeGroupId);
          const recipe = recipeId ? recipeMap.get(recipeId) : null;
          meal = {
            recipeGroupId: item.recipeGroupId,
            recipeName: item.recipeName ?? "Recept",
            recipeId: recipeId ?? null,
            photoUrl: recipe?.photoUrl ?? null,
            ingredientCount: 0,
          };
          entry.meals.push(meal);
        }
        meal.ingredientCount++;
      } else {
        entry.looseIngredients.push({
          name: item.name,
          quantity: item.quantity,
          photoUrl: item.fromStock && item.stockPhotoUrl ? item.stockPhotoUrl : null,
          fromStock: item.fromStock === true || undefined,
        });
      }
    }
  }

  return result;
}
