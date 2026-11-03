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

it('biedt een aparte categorie voor geïmporteerde recepten die nog te testen zijn', () => {
  expect(RECIPE_CATEGORIES.find(category => category.id === 'nog_te_testen')).toMatchObject({
    label: 'Nog te testen', labelPlural: 'Nog te testen',
  });
});
