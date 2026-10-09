import { describe, expect, it } from "vitest";
import { addQuantities, findMergeTarget } from "./list-item-merge";

const base = { section: "Algemeen", checked: false };

describe("addQuantities", () => {
  it("adds pieces and pluralises", () => {
    expect(addQuantities("1 stuk", "1 stuk")).toBe("2 stuks");
    expect(addQuantities("2 stuks", "1 stuk")).toBe("3 stuks");
    expect(addQuantities("500 g", "250 g")).toBe("750 g");
  });
  it("refuses different units", () => {
    expect(addQuantities("1 stuk", "500 g")).toBeNull();
  });
});

describe("findMergeTarget", () => {
  it("merges the same product on the same day, case-insensitive", () => {
    const existing = [{ id: "a", name: "Komkommer", quantity: "1 stuk", ...base }];
    expect(findMergeTarget(existing, { name: "komkommer ", quantity: "1 stuk", section: "Algemeen" })).toEqual({
      id: "a",
      quantity: "2 stuks",
      reopen: false,
    });
  });
  it("keeps other days, recipe ingredients and stock items apart", () => {
    const existing = [
      { id: "a", name: "Komkommer", quantity: "1 stuk", ...base, section: "Maandag" },
      { id: "b", name: "Komkommer", quantity: "1 stuk", ...base, recipeGroupId: "r1" },
    ];
    expect(findMergeTarget(existing, { name: "Komkommer", quantity: "1 stuk", section: "Algemeen" })).toBeNull();
    expect(findMergeTarget([{ id: "c", name: "Komkommer", quantity: "1 stuk", ...base }], { name: "Komkommer", quantity: "1 stuk", section: "Algemeen", recipeGroupId: "r2" })).toBeNull();
  });
  it("reopens an already checked item with the new quantity", () => {
    const existing = [{ id: "a", name: "Komkommer", quantity: "3 stuks", ...base, checked: true }];
    expect(findMergeTarget(existing, { name: "Komkommer", quantity: "1 stuk", section: "Algemeen" })).toEqual({
      id: "a",
      quantity: "1 stuk",
      reopen: true,
    });
  });
});
