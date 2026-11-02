import { describe, expect, it } from "vitest";
import { pantryNewPatch, pantryStockPatch } from "./pantry-add";

describe("pantryStockPatch", () => {
  it("telt het aantal op bij een product dat er al is", () => {
    expect(pantryStockPatch({ packages: 2 }, 3, "")).toEqual({ packages: 5, expiryDate: null });
  });

  it("bewaart een nieuwe vervaldatum", () => {
    expect(pantryStockPatch({ packages: 1 }, 1, "2027-05-01").expiryDate).toBe("2027-05-01");
  });
});

describe("pantryNewPatch", () => {
  it("maakt een nieuw product met eenheid en aantal", () => {
    expect(pantryNewPatch(2, "fles", "")).toEqual({ unit: "fles", quantityPerPackage: 1, packages: 2 });
  });

  it("houdt het aantal bij gewicht als aantal pakken", () => {
    expect(pantryNewPatch(3, "g", "2027-05-01")).toEqual({ unit: "g", quantityPerPackage: 500, packages: 3, expiryDate: "2027-05-01" });
  });
});
