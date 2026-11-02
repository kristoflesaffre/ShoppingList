import { describe, expect, it } from "vitest";
import { categorySubgroupKey, categorySubgroups, isFruitName } from "./item-ingredient-category";

describe("isFruitName", () => {
  it("herkent het fruit van het lijstje", () => {
    for (const n of ["Zespri gold kiwi", "Appels", "Bananen", "Mandarijnen", "Limoen", "perziken", "Peren", "Aardbeien", "Bosbessen", "Frambozen", "Sinaasappels", "Kersen"]) {
      expect(isFruitName(n), n).toBe(true);
    }
  });
  it("laat zich niet vangen door groenten met een fruitnaam erin", () => {
    for (const n of ["Aardappelen", "Zoete aardappelen", "Aardpeer", "Kerstomaatjes", "Pruimtomaten", "Citroengras", "Avocado", "Ajuin", "Komkommer", "Look", "Tuinkers", "Peterselie"]) {
      expect(isFruitName(n), n).toBe(false);
    }
  });
});

describe("categorySubgroups", () => {
  const name = (n: string) => n;
  it("zet groenten boven fruit en behoudt de volgorde binnen elke groep", () => {
    expect(categorySubgroups("Groenten & Fruit", ["Appels", "Ajuin", "Bananen", "Look"], name)).toEqual([
      { label: "Groenten", items: ["Ajuin", "Look"] },
      { label: "Fruit", items: ["Appels", "Bananen"] },
    ]);
  });
  it("geen subkopje als er maar één soort is", () => {
    expect(categorySubgroups("Groenten & Fruit", ["Appels", "Bananen"], name)).toEqual([{ label: null, items: ["Appels", "Bananen"] }]);
    expect(categorySubgroups("Groenten & Fruit", ["Ajuin"], name)).toEqual([{ label: null, items: ["Ajuin"] }]);
  });
  it("laat andere categorieën ongemoeid", () => {
    expect(categorySubgroups("Zuivel", ["Appelsap", "Melk"], name)).toEqual([{ label: null, items: ["Appelsap", "Melk"] }]);
    expect(categorySubgroupKey("Zuivel", "Appelsap")).toBe("");
  });
  it("sleepgroep volgt de subgroep", () => {
    expect(categorySubgroupKey("Groenten & Fruit", "Appels")).toBe("fruit");
    expect(categorySubgroupKey("Groenten & Fruit", "Aardappelen")).toBe("groenten");
  });
});
