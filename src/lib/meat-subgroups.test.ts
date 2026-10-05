import { describe, expect, it } from "vitest";
import { groupMeatSubtypes, meatSubgroupRank } from "./item-ingredient-category";

describe("groupMeatSubtypes", () => {
  it("zet alle kip samen, dan kalkoen, rund, varken, vleeswaren en worst", () => {
    const names = ["Americain", "Kipfilet", "Ham", "Gebraden kip", "Kalkoenlapjes", "Worst", "Spek", "Kippenballetjes", "Gehakt", "Salami"];
    expect(groupMeatSubtypes("Vlees & Charcuterie", names, (n) => n)).toEqual([
      "Kipfilet", "Gebraden kip", "Kippenballetjes", "Kalkoenlapjes", "Americain", "Gehakt", "Spek", "Ham", "Salami", "Worst",
    ]);
  });
  it("laat andere categorieën ongemoeid", () => {
    const names = ["Bananen", "Appels"];
    expect(groupMeatSubtypes("Groenten & Fruit", names, (n) => n)).toBe(names);
  });
  it("herkent hamburger als rund en kipschnitzel als kip", () => {
    expect(meatSubgroupRank("Hamburger")).toBe(2);
    expect(meatSubgroupRank("Kipschnitzel")).toBe(0);
    expect(meatSubgroupRank("Schnitzel")).toBe(3);
  });
});

describe("worst", () => {
  it("kalfsworst en witte pensen horen bij worst, kippenworsten bij kip", () => {
    expect(meatSubgroupRank("Kalfsworst")).toBe(5);
    expect(meatSubgroupRank("Witte pensen")).toBe(5);
    expect(meatSubgroupRank("Kippenworsten")).toBe(0);
  });
});
