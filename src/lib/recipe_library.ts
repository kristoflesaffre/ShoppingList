/**
 * Receptenbibliotheek types.
 * Data wordt opgeslagen in InstantDB (zie instant.schema.ts).
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
  /** Optionele receptfoto (data-URL). */
  photoUrl?: string | null;
  ingredients: RecipeIngredient[];
};
