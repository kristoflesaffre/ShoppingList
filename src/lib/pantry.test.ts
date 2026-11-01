import { describe, expect, it } from "vitest";
import { isPantryItem, isPantryLow, pantryGroupOf, pantryStatsLabel, PANTRY_ITEM_TYPE } from "./pantry";

describe("isPantryItem", () => {
  it("houdt de diepvries apart", () => {
    expect(isPantryItem({ type: PANTRY_ITEM_TYPE })).toBe(true);
    expect(isPantryItem({ type: "product" })).toBe(false);
    expect(isPantryItem({ type: "gerecht" })).toBe(false);
    expect(isPantryItem(null)).toBe(false);
  });
});

describe("pantryGroupOf", () => {
  it.each([
    ["Bloem", "bakken"],
    ["Bruine suiker", "bakken"],
    ["Spaghetti", "bakken"],
    ["Olijfolie", "olie"],
    ["Zonnebloemolie", "olie"],
    ["Azijn", "olie"],
    ["Mosterd", "olie"],
    ["Chips", "snacks"],
    ["Koekjes", "snacks"],
    ["Nootjes", "snacks"],
    ["Wc-papier", "overig"],
  ])("%s → %s", (name, group) => {
    expect(pantryGroupOf(name)).toBe(group);
  });
});

describe("pantryStatsLabel", () => {
  it("telt producten en wat bijna op is", () => {
    expect(pantryStatsLabel([{ packages: 1 }, { packages: 3 }])).toBe("2 producten · 1 bijna op");
    expect(pantryStatsLabel([{ packages: 2 }])).toBe("1 product");
    expect(isPantryLow({ packages: 1 })).toBe(true);
  });
});
