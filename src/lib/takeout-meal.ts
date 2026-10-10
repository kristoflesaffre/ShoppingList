export const TAKEOUT_MEAL_CATEGORY = "Afhaalgerechten";
export const TAKEOUT_MEAL_PHOTO_URL = "/images/frituur/frieten_groot_320.webp";

const TAKEOUT_MEAL_NAMES = new Set([
  "frituur",
  "frieten afhalen",
  "frietjes afhalen",
]);

function normalizeTakeoutName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Afhaalmaaltijden zijn geplande gerechten, geen afvinkbare boodschappen. */
export function isTakeoutMealName(name: string): boolean {
  return TAKEOUT_MEAL_NAMES.has(normalizeTakeoutName(name));
}
