import { normalizeForMatch } from "@/lib/item-photo-matching";
import type { SavedRecipe } from "@/lib/recipe_library";

export function matchRecipesForAutocomplete(
  query: string,
  recipes: SavedRecipe[],
  limit: number,
): SavedRecipe[] {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery || recipes.length === 0 || limit <= 0) return [];

  return recipes
    .map((recipe) => ({
      recipe,
      normalizedName: normalizeForMatch(recipe.name),
    }))
    .filter(({ normalizedName }) => normalizedName.includes(normalizedQuery))
    .sort((a, b) => {
      const aStarts = a.normalizedName.startsWith(normalizedQuery);
      const bStarts = b.normalizedName.startsWith(normalizedQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.recipe.name.localeCompare(b.recipe.name, "nl");
    })
    .slice(0, limit)
    .map(({ recipe }) => recipe);
}
