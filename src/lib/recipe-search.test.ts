import { describe, expect, it } from "vitest";
import { matchRecipesForAutocomplete } from "@/lib/recipe-search";
import type { SavedRecipe } from "@/lib/recipe_library";

const recipes: SavedRecipe[] = [
  {
    id: "1",
    name: "Tomatensoep",
    link: "",
    persons: 2,
    ingredients: [],
  },
  {
    id: "2",
    name: "Tomatensalade",
    link: "",
    persons: 2,
    ingredients: [],
  },
  {
    id: "3",
    name: "Gevulde tomaten",
    link: "",
    persons: 2,
    ingredients: [],
  },
];

describe("matchRecipesForAutocomplete", () => {
  it("zoekt recepten naast losse items op een deel van de naam", () => {
    expect(matchRecipesForAutocomplete("soep", recipes, 10).map((r) => r.id)).toEqual([
      "1",
    ]);
  });

  it("zet een match aan het begin voor een match midden in de naam", () => {
    expect(matchRecipesForAutocomplete("tomaten", recipes, 10).map((r) => r.id)).toEqual([
      "2",
      "1",
      "3",
    ]);
  });

  it("geeft zonder zoekterm geen recepten terug", () => {
    expect(matchRecipesForAutocomplete("", recipes, 10)).toEqual([]);
  });
});
