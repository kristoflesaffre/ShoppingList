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

  it("volgt een synoniem naar een foto die enkel per aantal bestaat", () => {
    const slugs = ["eieren_1", "eieren_2", "eieren_6"];
    const synonyms = { ei: "eieren" };
    expect(matchIngredientPhotoUrl("Ei", slugs, synonyms, 160)).toBe("/images/ingredients/eieren_1_160.webp");
    expect(matchIngredientPhotoUrl("Ei", slugs, synonyms, 160, "3")).toBe("/images/ingredients/eieren_2_160.webp");
  });
});
