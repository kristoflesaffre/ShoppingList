import { describe, expect, it } from "vitest";
import { RECIPE_CATEGORIES, isRecentImport, isSlowCooker, recipeImportedAt } from "@/lib/recipe_library";

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

describe("recent geïmporteerde recepten", () => {
  const now = Date.parse("2026-11-08T12:00:00Z");
  it("leest de importtijd uit een negatieve order van de importer", () => {
    expect(recipeImportedAt(-1778238041621)).toBe(1778238041621);
    expect(recipeImportedAt(3)).toBeNull();
    expect(recipeImportedAt(-4)).toBeNull();
    expect(recipeImportedAt(undefined)).toBeNull();
  });
  it("heet «Nieuw» tot drie dagen na de import", () => {
    expect(isRecentImport({ importedAt: now - 60_000 }, now)).toBe(true);
    expect(isRecentImport({ importedAt: now - 2.9 * 86_400_000 }, now)).toBe(true);
    expect(isRecentImport({ importedAt: now - 3.1 * 86_400_000 }, now)).toBe(false);
    expect(isRecentImport({ importedAt: null }, now)).toBe(false);
  });
});

describe("isSlowCooker", () => {
  const base = { name: "Kip curry", steps: "Bak aan.", ingredients: [{ id: "1", name: "kip", quantity: "1" }] };
  it("herkent slowcooker en crockpot in titel, bereiding of ingrediënten", () => {
    expect(isSlowCooker({ ...base, name: "Pulled pork uit de slowcooker" })).toBe(true);
    expect(isSlowCooker({ ...base, steps: "Zet 6 uur in de Crock-Pot." })).toBe(true);
    expect(isSlowCooker({ ...base, steps: "Slow cooker op laag." })).toBe(true);
    expect(isSlowCooker(base)).toBe(false);
  });
});
