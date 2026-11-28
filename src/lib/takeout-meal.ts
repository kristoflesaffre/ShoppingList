export const TAKEOUT_MEAL_CATEGORY = "Afhaalgerechten";
export const RESTAURANT_MEAL_CATEGORY = "Restaurant";
export const TAKEOUT_MEAL_PHOTO_URL = "/images/frituur/frieten_groot_320.webp";
export const RESTAURANT_MEAL_PHOTO_URL = "/images/afspraken/reservatie_restaurant_480.webp";
const RESTAURANT_NAMES = new Set(["restaurant", "resto", "uit eten", "gaan eten", "restaurant reservatie", "reservatie restaurant"]);

export function isRestaurantMealName(name: string): boolean {
  return RESTAURANT_NAMES.has(normalizeTakeoutName(name));
}

/** Geplande maaltijden waarvoor geen producten gekocht hoeven te worden. */
export function isNonShoppingMealName(name: string): boolean {
  return isTakeoutMealName(name) || isRestaurantMealName(name);
}

export const nonShoppingMealPhoto = (name: string) => isRestaurantMealName(name) ? RESTAURANT_MEAL_PHOTO_URL : TAKEOUT_MEAL_PHOTO_URL;
export const nonShoppingMealLabel = (name: string) => isRestaurantMealName(name) ? "Uit eten" : "Afhalen";
export const nonShoppingMealCategory = (name: string) => isRestaurantMealName(name) ? RESTAURANT_MEAL_CATEGORY : TAKEOUT_MEAL_CATEGORY;

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
