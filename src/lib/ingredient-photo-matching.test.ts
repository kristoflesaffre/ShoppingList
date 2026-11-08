import { describe, expect, it } from "vitest";
import { matchIngredientPhotoUrl } from "@/lib/ingredient-photo-matching";
import synonyms from "../../public/ingredient-synonyms.json";

describe("matchIngredientPhotoUrl", () => {
  it.each(["sambal oelek", "oestersaus"])("koppelt de aanvullende sausfoto voor %s", (name) => {
    const slug = name.replace(/ /g, "_");
    for (const size of [160, 240, 320] as const) {
      expect(matchIngredientPhotoUrl(name, ["sambal_oelek", "oestersaus"], synonyms, size)).toBe(`/images/ingredients/${slug}_${size}.webp`);
    }
  });
  it("gebruikt de bestaande zwarte peperfoto in plaats van generieke witte peper", () => {
    expect(matchIngredientPhotoUrl("zwarte peper", ["peper", "zwarte_peperbollen"], synonyms, 320)).toBe("/images/ingredients/zwarte_peperbollen_320.webp");
  });
  it.each(["baking soda", "zuiveringszout", "Sugar snaps"])("koppelt de goedgekeurde ingrediëntfoto voor %s", (name) => {
    const slug = name === "Sugar snaps" ? "sugar_snaps" : "baking_soda";
    for (const size of [160, 240, 320] as const) {
      expect(matchIngredientPhotoUrl(name, ["baking_soda", "sugar_snaps", "bakpoeder"], synonyms, size)).toBe(`/images/ingredients/${slug}_${size}.webp`);
    }
  });

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
