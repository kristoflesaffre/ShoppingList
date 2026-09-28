import { describe, expect, it } from "vitest";
import { RECIPE_CATEGORIES } from "@/lib/recipe_library";

describe("recipe categories", () => {
  it("toont de primaire receptcategorieën in de afgesproken volgorde", () => {
    expect(RECIPE_CATEGORIES.slice(0, 4).map((category) => category.id)).toEqual([
      "soep",
      "hoofdgerecht",
      "bijgerecht",
      "dessert",
    ]);
  });
});
