import { describe, expect, it } from "vitest";
import type { DayEntry } from "@/lib/calendar-utils";
import { agoLabel, computeRecipeStats, lastEatenLabel, longAgoRecipes } from "@/lib/recipe-stats";

function day(iso: string, recipeIds: string[]): [string, DayEntry] {
  const [y, m, d] = iso.split("-").map(Number);
  return [
    iso,
    {
      date: new Date(y, m - 1, d),
      meals: recipeIds.map((id) => ({ recipeGroupId: `g-${id}`, recipeName: id, recipeId: id, photoUrl: null, ingredientCount: 1 })),
      looseIngredients: [],
    },
  ];
}

const recipes = [
  { id: "wraps", name: "Chicken wraps", category: "hoofdgerecht" },
  { id: "soep", name: "Tomatensoep", category: "soep" },
  { id: "wafels", name: "Wafels", category: "dessert" },
  { id: "pasta", name: "Gevulde pasta", category: "hoofdgerecht" },
];

describe("computeRecipeStats", () => {
  const entries = new Map<string, DayEntry>([
    day("2026-09-01", ["wraps", "wafels"]),
    day("2026-09-20", ["wraps"]),
    day("2026-10-01", ["soep", "wraps"]),
    day("2026-10-12", ["soep"]), // toekomst telt niet mee
  ]);
  const stats = computeRecipeStats(entries, recipes, "2026-10-08");

  it("telt per dag, enkel tot en met vandaag, en sorteert op aantal", () => {
    expect(stats.ranking.map((s) => [s.recipeId, s.count])).toEqual([
      ["wraps", 3],
      ["soep", 1],
      ["pasta", 0],
    ]);
    expect(stats.ranking[0].lastIso).toBe("2026-10-01");
  });

  it("laat desserts weg en telt maaltijden en nooit-gegeten", () => {
    expect(stats.ranking.some((s) => s.recipeId === "wafels")).toBe(false);
    expect(stats.meals).toBe(4);
    expect(stats.never).toBe(1);
  });

  it("vindt recepten die lang niet gegeten zijn", () => {
    const long = longAgoRecipes(stats.ranking, "2026-12-01");
    expect(long.map((s) => s.recipeId)).toEqual(["wraps", "soep"]);
    expect(longAgoRecipes(stats.ranking, "2026-10-08")).toEqual([]);
  });
});

describe("labels", () => {
  it("formuleert hoe lang geleden", () => {
    expect(agoLabel("2026-10-08", "2026-10-08")).toBe("vandaag");
    expect(agoLabel("2026-10-04", "2026-10-08")).toBe("4 dagen");
    expect(agoLabel("2026-09-17", "2026-10-08")).toBe("3 weken");
    expect(agoLabel("2026-05-08", "2026-10-08")).toBe("5 maanden");
    expect(lastEatenLabel(null, "2026-10-08")).toBe("Nog nooit gegeten");
    expect(lastEatenLabel("2026-09-17", "2026-10-08")).toBe("Laatst 3 weken geleden");
    expect(lastEatenLabel("2026-09-17", "2026-10-08", false)).toBe("3 weken geleden");
  });
});
