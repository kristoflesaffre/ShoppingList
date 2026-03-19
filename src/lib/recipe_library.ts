/**
 * Persistente receptenbibliotheok (client-side, localStorage).
 * Zie docs/screens/new-recipe.md — recepten zijn globaal per browser.
 */

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: string;
};

export type SavedRecipe = {
  id: string;
  name: string;
  link: string;
  persons: number;
  ingredients: RecipeIngredient[];
};

const STORAGE_KEY = "shopping-list-recipe-library-v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isIngredient(v: unknown): v is RecipeIngredient {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.quantity === "string"
  );
}

function isSavedRecipe(v: unknown): v is SavedRecipe {
  if (!isRecord(v)) return false;
  if (
    typeof v.id !== "string" ||
    typeof v.name !== "string" ||
    typeof v.link !== "string" ||
    typeof v.persons !== "number" ||
    !Array.isArray(v.ingredients)
  ) {
    return false;
  }
  return v.ingredients.every(isIngredient);
}

export function loadRecipeLibrary(): SavedRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(isSavedRecipe);
  } catch {
    return [];
  }
}

export function saveRecipeLibrary(recipes: SavedRecipe[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch {
    // quota / private mode
  }
}
