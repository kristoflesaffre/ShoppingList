/**
 * Receptenbibliotheek types.
 * Data wordt opgeslagen in InstantDB (zie instant.schema.ts).
 */

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: string;
};

export type RecipeCategory =
  | "voorgerecht"
  | "hoofdgerecht"
  | "bijgerecht"
  | "dessert"
  | "cocktail"
  | "ontbijt"
  | "soep"
  | "snack"
  | "nog_te_testen";

export type RecipeCategoryMeta = {
  id: RecipeCategory;
  /** Enkelvoud (voor editor-picker) */
  label: string;
  /** Meervoud (voor filterschips + sectiehoofden) */
  labelPlural: string;
  dot: string;
};

export const RECIPE_CATEGORIES: RecipeCategoryMeta[] = [
  { id: "soep",         label: "Soep",         labelPlural: "Soepen",         dot: "#FF9500" },
  { id: "hoofdgerecht", label: "Hoofdgerecht", labelPlural: "Hoofdgerechten", dot: "#FF6B35" },
  { id: "bijgerecht",   label: "Bijgerecht",   labelPlural: "Bijgerechten",   dot: "#5AC8FA" },
  { id: "dessert",      label: "Dessert",      labelPlural: "Desserts",       dot: "#FF3B8B" },
  { id: "voorgerecht",  label: "Voorgerecht",  labelPlural: "Voorgerechten",  dot: "#34C759" },
  { id: "cocktail",     label: "Cocktail",     labelPlural: "Cocktails",      dot: "#AF52DE" },
  { id: "ontbijt",      label: "Ontbijt",      labelPlural: "Ontbijt",        dot: "#FFCC00" },
  { id: "snack",        label: "Snack",        labelPlural: "Snacks",         dot: "#30B0C7" },
  { id: "nog_te_testen", label: "Nog te testen", labelPlural: "Nog te testen", dot: "#A9ADF4" },
];

/** Subsecties binnen een categorie; nu enkel voor bijgerechten. Volgorde = volgorde in het overzicht. */
export const RECIPE_SUBCATEGORIES: Partial<Record<RecipeCategory, { id: string; label: string }[]>> = {
  bijgerecht: [
    { id: "vlees", label: "Vlees" },
    { id: "groentjes", label: "Groentjes" },
    { id: "brood", label: "Brood" },
    { id: "puree", label: "Aardappelgerechten" },
  ],
  /* «Te testen»: de soort gerecht, zodat je erop kunt filteren (de categorie blijft «nog_te_testen»). */
  nog_te_testen: RECIPE_CATEGORIES.filter((c) => c.id !== "nog_te_testen").map((c) => ({ id: c.id, label: c.label })),
};

/**
 * Deelt de recepten van één categorie op in subsecties (in hun bestaande volgorde). Recepten zonder (geldige)
 * subsectie komen onderaan onder «Andere». Geen subsecties voor deze categorie → null.
 */
export function groupBySubcategory<T extends { subcategory?: string | null }>(
  category: RecipeCategory | null | undefined,
  recipes: T[],
): { id: string; label: string; recipes: T[] }[] | null {
  const subs = category ? RECIPE_SUBCATEGORIES[category] : undefined;
  if (!subs) return null;
  const known = new Set(subs.map((s) => s.id));
  const groups = subs.map((s) => ({ ...s, recipes: recipes.filter((r) => r.subcategory === s.id) }));
  groups.push({ id: "andere", label: "Andere", recipes: recipes.filter((r) => !r.subcategory || !known.has(r.subcategory)) });
  return groups.filter((g) => g.recipes.length > 0);
}

export type SavedRecipe = {
  id: string;
  name: string;
  link: string;
  /** Optionele bereidingsstappen (plain text, 1 stap per regel). */
  steps?: string;
  persons: number;
  /** Optionele receptfoto (data-URL). */
  photoUrl?: string | null;
  category?: RecipeCategory | null;
  /** Subsectie binnen de categorie (zie RECIPE_SUBCATEGORIES). */
  subcategory?: string | null;
  canBeFrozen?: boolean | null;
  ingredients: RecipeIngredient[];
  /** Wanneer de TikTok-importer het recept toevoegde (ms), anders null. Zie `recipeImportedAt`. */
  importedAt?: number | null;
};

/**
 * De TikTok-importer zet een nieuw recept op `order: -Date.now()`, zodat het vooraan staat. Zo kennen we de
 * importtijd zonder extra veld. Gewone volgordes zijn kleine getallen; na herschikken is de tijd weg.
 */
export function recipeImportedAt(order: number | null | undefined): number | null {
  return typeof order === "number" && order < -1_000_000_000_000 ? -order : null;
}

/** Hoe lang een geïmporteerd recept «Nieuw» heet. */
export const RECENT_IMPORT_MS = 3 * 24 * 60 * 60 * 1000;

export function isRecentImport(recipe: Pick<SavedRecipe, "importedAt">, now = Date.now()): boolean {
  return recipe.importedAt != null && now - recipe.importedAt < RECENT_IMPORT_MS && recipe.importedAt <= now + 60_000;
}
