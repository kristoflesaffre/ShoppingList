import { describe, expect, it } from "vitest";
import { matchIngredientPhotoUrl } from "@/lib/ingredient-photo-matching";

describe("matchIngredientPhotoUrl", () => {
  const recipeOnlySlugs = [
    "bechamelsaus",
    "bladerdeeg",
    "erwtjes",
    "kroketjes",
  ];

  it.each(recipeOnlySlugs)("gebruikt de receptfoto voor %s", (slug) => {
    expect(matchIngredientPhotoUrl(slug, recipeOnlySlugs, {}, 320)).toBe(
      `/images/ingredients/${slug}_320.webp`,
    );
  });

  it("gebruikt kroketjes niet langer als synoniem voor aardappelnootjes", () => {
    expect(
      matchIngredientPhotoUrl(
        "Kroketjes",
        [...recipeOnlySlugs, "aardappelnootjes"],
        { aardappel_nootjes: "aardappelnootjes" },
        240,
      ),
    ).toBe("/images/ingredients/kroketjes_240.webp");
  });
});
