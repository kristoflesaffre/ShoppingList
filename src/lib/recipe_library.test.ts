import { describe, expect, it } from "vitest";
import { RECIPE_CATEGORIES, isRecentImport, recipeImportedAt } from "@/lib/recipe_library";

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
