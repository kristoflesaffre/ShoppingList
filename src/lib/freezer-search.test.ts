import { describe, expect, it } from "vitest";
import { buildFreezerSearch, freezerStockLabel, freezerUndoLines, freezerUnitPatch, nextFreezerUndo, type FreezerEntry } from "./freezer-search";

const dish = (id: string, name: string, packages: number, recipeId?: string): FreezerEntry => ({ id, type: "gerecht", name, quantityPerPackage: 1, unit: "portie", packages, ...(recipeId ? { recipeId } : {}) });
const product = (id: string, name: string, packages: number, unit = "stuk", quantityPerPackage = 1): FreezerEntry => ({ id, type: "product", name, quantityPerPackage, unit, packages });

const items = [dish("f1", "Wortelsoep", 3, "r1"), dish("f2", "Witloofsoep", 2, "r2"), product("f3", "Erwtjes", 2, "zak")];
const recipes = [
  { id: "r1", name: "Wortelsoep", persons: 4 },
  { id: "r3", name: "Paprikasoep", persons: 2 },
];

describe("freezer stock labels", () => {
  it.each([
    [dish("a", "x", 1), "1 portie"],
    [dish("a", "x", 3), "3 porties"],
    [product("a", "x", 1, "zak"), "1 zak"],
    [product("a", "x", 2, "zak"), "2 zakken"],
    [product("a", "x", 2, "stuk"), "2 stuks"],
    [product("a", "x", 1, "g", 500), "500 g"],
    [product("a", "x", 2, "g", 500), "2 × 500 g"],
  ])("labels %o as %s", (item, label) => expect(freezerStockLabel(item)).toBe(label));

  it("switches to one package of a weight", () => {
    expect(freezerUnitPatch({ packages: 3 }, "g")).toEqual({ unit: "g", quantityPerPackage: 500, packages: 1 });
    expect(freezerUnitPatch({ packages: 3 }, "zak")).toEqual({ unit: "zak", quantityPerPackage: 1, packages: 3 });
  });
});

describe("buildFreezerSearch", () => {
  it("lists what you have first and hides recipes that are already in the freezer", () => {
    const result = buildFreezerSearch({ query: "soep", items, recipes, productNames: ["Soepgroenten"], addedIds: new Set(), filter: "alles" });
    expect(result.inFreezer.map((i) => i.name)).toEqual(["Wortelsoep", "Witloofsoep"]);
    expect(result.recipes).toEqual([{ recipe: recipes[1], stock: null }]);
    expect(result.products).toEqual([{ name: "Soepgroenten", stock: null }]);
    expect(result.createName).toBe("soep");
  });

  it("keeps a just-added recipe in place with its stock instead of moving it to «In je diepvries»", () => {
    const added = dish("f9", "Paprikasoep", 1, "r3");
    const result = buildFreezerSearch({ query: "soep", items: [...items, added], recipes, productNames: [], addedIds: new Set(["f9"]), filter: "alles" });
    expect(result.inFreezer.map((i) => i.id)).toEqual(["f1", "f2"]);
    expect(result.recipes).toEqual([{ recipe: recipes[1], stock: added }]);
  });

  it("keeps a new free-text product visible and stops offering to create it", () => {
    const added = product("f9", "so", 1);
    const result = buildFreezerSearch({ query: "so", items: [...items, added], recipes: [], productNames: ["Soepgroenten"], addedIds: new Set(["f9"]), filter: "alles" });
    expect(result.products.map((p) => p.name)).toEqual(["so", "Soepgroenten"]);
    expect(result.products[0].stock).toBe(added);
    expect(result.createName).toBeNull();
  });

  it("does not offer a product that already lies in the freezer", () => {
    const result = buildFreezerSearch({ query: "erwtjes", items, recipes: [], productNames: ["Erwtjes"], addedIds: new Set(), filter: "alles" });
    expect(result.inFreezer.map((i) => i.id)).toEqual(["f3"]);
    expect(result.products).toEqual([]);
    expect(result.createName).toBeNull();
  });

  it("respects the Gerechten and Producten filters", () => {
    const dishes = buildFreezerSearch({ query: "e", items, recipes, productNames: ["Erwten"], addedIds: new Set(), filter: "gerecht" });
    expect(dishes.inFreezer.every((i) => i.type === "gerecht")).toBe(true);
    expect(dishes.products).toEqual([]);
    expect(dishes.createName).toBeNull();
    const goods = buildFreezerSearch({ query: "e", items, recipes, productNames: ["Erwten"], addedIds: new Set(), filter: "product" });
    expect(goods.inFreezer.map((i) => i.id)).toEqual(["f3"]);
    expect(goods.recipes).toEqual([]);
  });
});

describe("undo", () => {
  it("describes an add, a change and a removal", () => {
    const added = dish("f9", "Paprikasoep", 1);
    expect(freezerUndoLines({ id: "f9", before: null, after: added })).toEqual(["Paprikasoep toegevoegd", "1 portie in je diepvries"]);
    expect(freezerUndoLines({ id: "f1", before: items[0], after: { ...items[0], packages: 4 } })).toEqual(["Wortelsoep +1", "nog 4 porties"]);
    expect(freezerUndoLines({ id: "f1", before: items[0], after: null })).toEqual(["Wortelsoep verwijderd", "uit de diepvries"]);
    const olie = { id: "p1", type: "voorraadkast", name: "Olijfolie", quantityPerPackage: 1, unit: "fles", packages: 1 };
    expect(freezerUndoLines({ id: "p1", before: null, after: olie }, "voorraadkast")).toEqual(["Olijfolie toegevoegd", "1 fles in je voorraadkast"]);
    expect(freezerUndoLines({ id: "p1", before: olie, after: null }, "voorraadkast")).toEqual(["Olijfolie verwijderd", "uit de voorraadkast"]);
  });

  it("keeps an add as an add while you adjust it, and drops it when you remove it again", () => {
    const added = product("f9", "Spinazie", 1);
    const start = { id: "f9", before: null, after: added };
    const changed = nextFreezerUndo(start, added, { ...added, ...freezerUnitPatch(added, "zak") });
    expect(changed).toMatchObject({ before: null, after: { unit: "zak" } });
    expect(freezerUndoLines(changed!)).toEqual(["Spinazie toegevoegd", "1 zak in je diepvries"]);
    expect(nextFreezerUndo(changed, { ...added, unit: "zak" }, null)).toBeNull();
  });

  it("clears when a change is reverted by hand", () => {
    const first = nextFreezerUndo(null, items[0], { ...items[0], packages: 4 });
    expect(nextFreezerUndo(first, { ...items[0], packages: 4 }, items[0])).toBeNull();
  });
});

describe("voorraadkast search (same helpers)", () => {
  const pantry: FreezerEntry[] = [
    { id: "p1", type: "voorraadkast", name: "Bloem", quantityPerPackage: 1, unit: "pak", packages: 2 },
    { id: "p2", type: "voorraadkast", name: "Olijfolie", quantityPerPackage: 1, unit: "fles", packages: 1 },
  ];
  it("shows what is in the pantry first, catalog products to add, and a new-product option", () => {
    const r = buildFreezerSearch({ query: "bl", items: pantry, recipes: [], productNames: ["Bloem", "Bladerdeeg"], addedIds: new Set(), filter: "product" });
    expect(r.inFreezer.map((i) => i.name)).toEqual(["Bloem"]);
    expect(r.products.map((p) => p.name)).toEqual(["Bladerdeeg"]);
    expect(r.recipes).toEqual([]);
    expect(r.createName).toBe("bl");
  });
  it("offers no new product when the exact name is already in the pantry", () => {
    const r = buildFreezerSearch({ query: "olijfolie", items: pantry, recipes: [], productNames: [], addedIds: new Set(), filter: "product" });
    expect(r.createName).toBeNull();
  });
});
