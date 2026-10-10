import { describe, expect, it } from "vitest";
import { addQuantities, findMergeTarget, mergeLooseDuplicates } from "./list-item-merge";

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

describe("mergeLooseDuplicates", () => {
  const it0 = (id: string, name: string, quantity: string, section: string, extra: Partial<{ checked: boolean; recipeGroupId: string; fromStock: boolean }> = {}) => ({
    id, name, quantity, section, checked: false, ...extra,
  });

  it("voegt hetzelfde losse product over dagen samen", () => {
    const out = mergeLooseDuplicates([it0("a", "Kroketjes", "1 stuk", "Algemeen"), it0("b", "kroketjes", "1 stuk", "Zaterdag")]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "a", quantity: "2 stuks", mergedIds: ["a", "b"] });
  });

  it("afgevinkt enkel als alles afgevinkt is", () => {
    const out = mergeLooseDuplicates([it0("a", "Melk", "1 stuk", "A", { checked: true }), it0("b", "Melk", "1 stuk", "B")]);
    expect(out[0].checked).toBe(false);
  });

  it("laat receptingrediënten, diepvries en andere eenheden apart", () => {
    const out = mergeLooseDuplicates([
      it0("a", "Look", "1 stuk", "A"),
      it0("b", "Look", "2 stuks", "B", { recipeGroupId: "r1" }),
      it0("c", "Look", "200 gram", "C"),
      it0("d", "Look", "1 stuk", "D", { fromStock: true }),
    ]);
    expect(out.map((i) => i.id)).toEqual(["a", "b", "c", "d"]);
  });
});
