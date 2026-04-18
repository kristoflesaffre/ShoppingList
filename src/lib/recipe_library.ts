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
  | "snack";

export type RecipeCategoryMeta = {
  id: RecipeCategory;
  /** Enkelvoud (voor editor-picker) */
  label: string;
  /** Meervoud (voor filterschips + sectiehoofden) */
  labelPlural: string;
  dot: string;
};

export const RECIPE_CATEGORIES: RecipeCategoryMeta[] = [
  { id: "voorgerecht",  label: "Voorgerecht",  labelPlural: "Voorgerechten",  dot: "#34C759" },
  { id: "hoofdgerecht", label: "Hoofdgerecht", labelPlural: "Hoofdgerechten", dot: "#FF6B35" },
  { id: "bijgerecht",   label: "Bijgerecht",   labelPlural: "Bijgerechten",   dot: "#5AC8FA" },
  { id: "dessert",      label: "Dessert",      labelPlural: "Desserts",       dot: "#FF3B8B" },
  { id: "cocktail",     label: "Cocktail",     labelPlural: "Cocktails",      dot: "#AF52DE" },
  { id: "ontbijt",      label: "Ontbijt",      labelPlural: "Ontbijt",        dot: "#FFCC00" },
  { id: "soep",         label: "Soep",         labelPlural: "Soepen",         dot: "#FF9500" },
  { id: "snack",        label: "Snack",        labelPlural: "Snacks",         dot: "#30B0C7" },
];

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
  canBeFrozen?: boolean | null;
  ingredients: RecipeIngredient[];
};
