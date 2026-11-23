import { describe, expect, it } from "vitest";
import { dayModel, planningListId, sectionForIso, stepQuantity, stripDays } from "./day-meal-edit";

const lists = [
  {
    id: "L1",
    date: "16 november 2026",
    items: [
      { id: "a", name: "Spaghetti", quantity: "500 g", section: "Zondag", itemDate: "2026-11-22", recipeGroupId: "recipe-r1-1763000000000", recipeName: "Spaghetti bolognese", checked: true },
      { id: "b", name: "Gehakt", quantity: "500 g", section: "Zondag", itemDate: "2026-11-22", recipeGroupId: "recipe-r1-1763000000000", recipeName: "Spaghetti bolognese" },
      { id: "c", name: "Gebraden kip (diepvries)", quantity: "1", section: "Zondag", itemDate: "2026-11-22", fromStock: true },
      { id: "d", name: "Kerstomaatjes", quantity: "1 pak", section: "Zondag", itemDate: "2026-11-22" },
      { id: "e", name: "Frituur", quantity: "1", section: "Zondag", itemDate: "2026-11-22" },
      { id: "f", name: "Oregano", quantity: "1", section: "Zondag", itemDate: "2026-11-22", fromStock: true, stockSource: "pantry" },
      { id: "g", name: "Melk", quantity: "1", section: "Algemeen" },
      { id: "h", name: "Brood", quantity: "1", section: "Maandag", itemDate: "2026-11-23" },
    ],
  },
  { id: "M", date: "1 januari 2026", isMasterTemplate: true, items: [{ id: "x", name: "Kaas", quantity: "1", section: "Zondag", itemDate: "2026-11-22" }] },
];

describe("dayModel", () => {
  it("groepeert per gerecht, met ids, en houdt losse items apart", () => {
    const m = dayModel(lists, [{ id: "r1", name: "Spaghetti bolognese", photoUrl: "p.webp" }], "2026-11-22");
    expect(m.meals.map((x) => [x.kind, x.name, x.items.map((i) => i.id)])).toEqual([
      ["recipe", "Spaghetti bolognese", ["a", "b"]],
      ["stock", "Gebraden kip", ["c"]],
      ["takeout", "Frituur", ["e"]],
    ]);
    expect(m.meals[0].recipeId).toBe("r1");
    expect(m.meals[0].photoUrl).toBe("p.webp");
    expect(m.meals[0].ingredients.filter((i) => i.checked).map((i) => i.id)).toEqual(["a"]);
    expect(m.loose.map((i) => i.id)).toEqual(["d", "f"]);
    expect(m.loose[0].listId).toBe("L1");
  });
});

describe("planningListId", () => {
  it("kiest het lijstje met eten voor de komende dagen", () => {
    expect(planningListId([{ id: "old", date: "1 maart 2026", items: [] }, ...lists], "2026-11-21")).toBe("L1");
  });
});

describe("hulpjes", () => {
  it("dagnaam van een datum", () => {
    expect(sectionForIso("2026-11-22")).toBe("Zondag");
    expect(sectionForIso("2026-11-23")).toBe("Maandag");
  });
  it("weekstrook van vandaag, met de geopende dag erbij", () => {
    expect(stripDays("2026-11-22", "2026-11-24")).toHaveLength(7);
    expect(stripDays("2026-11-22", "2026-11-20")[0]).toBe("2026-11-20");
  });
  it("aantal een stap aanpassen", () => {
    expect(stepQuantity("2 stuks", 1)).toBe("3 stuks");
    expect(stepQuantity("2 stuks", -1)).toBe("1 stuk");
    expect(stepQuantity("1 pak", -1)).toBe("1 pak");
    expect(stepQuantity("4", 1)).toBe("5");
    expect(stepQuantity("500 g", 1)).toBeNull();
    expect(stepQuantity("een handje", 1)).toBeNull();
  });
});
