import { describe, expect, it } from "vitest";
import { isPantryItem, isPantryLow, isPantryProduct, pantryGroupOf, pantryStatsLabel, PANTRY_ITEM_TYPE } from "./pantry";

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
    ["Arachideolie", "olie"],
    ["Samoerai", "olie"],
    ["Satekruiden", "kruiden"],
    ["Zout", "kruiden"],
    ["Peper", "kruiden"],
    ["Paprikapoeder", "kruiden"],
    ["Kaneel", "kruiden"],
    ["Oregano", "kruiden"],
    ["Nootmuskaat", "kruiden"],
    ["Currypoeder", "kruiden"],
    ["Knoflookpoeder", "kruiden"],
    ["Kipkruiden", "kruiden"],
    ["Tijm", "kruiden"],
    ["Kruidenolie", "olie"],
    ["Bakpoeder", "bakken"],
    ["Waspoeder", "overig"],
    ["Chips", "snacks"],
    ["Koekjes", "snacks"],
    ["Nootjes", "snacks"],
    ["Wc-papier", "overig"],
  ])("%s → %s", (name, group) => {
    expect(pantryGroupOf(name)).toBe(group);
  });
  it.each(["Peperkoek", "Zoute pinda's", "Kruidenboter", "Kruidnoten"])("%s hoort niet bij de kruiden", (name) => {
    expect(pantryGroupOf(name)).not.toBe("kruiden");
  });
});

describe("isPantryProduct", () => {
  it.each([
    "Diepvriesfrieten",
    "Diepvriesaardbeien",
    "Wortelen diepvries",
    "Pizza",
    "Erwtjes",
    "Kipfilet",
    "Gehakt",
    "Zalm",
    "Yoghurt",
    "Kaas blok",
    "Tomaten",
    "Pijpajuin",
    "Stokbrood",
    "Bladerdeeg",
    "Verse lasagnebladen",
    "Paspoort",
    "Jas man",
    "Planten water geven",
  ])("%s hoort er niet in", (name) => {
    expect(isPantryProduct(name)).toBe(false);
  });

  it.each([
    "Bloem",
    "Olijfolie",
    "Kippenbouillon",
    "Blik tomaten blokjes",
    "Chips",
    "Koffiebonen",
    "Rode wijn",
    "Nutella",
    "Melk halfvol",
    "Havermelk",
    "Aardappelen",
    "Ajuinen",
    "Wraps",
    "Destop",
    "Deodorant",
    "Deodorant man",
    "Douchegel",
  ])("%s hoort er wel in", (name) => {
    expect(isPantryProduct(name)).toBe(true);
  });
});

describe("pantryStatsLabel", () => {
  it("telt producten en wat bijna op is", () => {
    expect(pantryStatsLabel([{ packages: 1 }, { packages: 3 }])).toBe("2 producten · 1 bijna op");
    expect(pantryStatsLabel([{ packages: 2 }])).toBe("1 product");
    expect(isPantryLow({ packages: 1 })).toBe(true);
  });
});
