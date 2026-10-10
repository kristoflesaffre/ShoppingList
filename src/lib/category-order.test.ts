import { describe, expect, it } from "vitest";
import { mergeCategoryOrder, parseCategoryOrderByStore, serializeCategoryOrderByStore } from "./category-order";

describe("parseCategoryOrderByStore", () => {
  it("leest de volgorde per winkel en negeert rommel", () => {
    expect(parseCategoryOrderByStore('{"lidl":["Brood","Diepvries"],"delhaize":"x","x":[1,""]}')).toEqual({ lidl: ["Brood", "Diepvries"] });
    expect(parseCategoryOrderByStore("niet json")).toEqual({});
    expect(parseCategoryOrderByStore(undefined)).toEqual({});
  });

  it("schrijft en leest terug", () => {
    const map = { lidl: ["A", "B"], delhaize: ["B", "A"] };
    expect(parseCategoryOrderByStore(serializeCategoryOrderByStore(map))).toEqual(map);
  });
});

describe("mergeCategoryOrder", () => {
  it("zonder verborgen categorieën is het gewoon de nieuwe volgorde", () => {
    expect(mergeCategoryOrder(["A", "B", "C"], ["C", "A", "B"])).toEqual(["C", "A", "B"]);
  });

  it("houdt verborgen categorieën achter hun vroegere voorganger", () => {
    // Winkel: Groenten, Brood, Zuivel, Diepvries. Op het lijstje enkel Groenten, Zuivel, Diepvries.
    const previous = ["Groenten", "Brood", "Zuivel", "Diepvries"];
    // Diepvries naar voor gesleept.
    expect(mergeCategoryOrder(previous, ["Diepvries", "Groenten", "Zuivel"])).toEqual(["Diepvries", "Groenten", "Brood", "Zuivel"]);
  });

  it("verborgen categorieën die vooraan stonden blijven vooraan", () => {
    expect(mergeCategoryOrder(["Brood", "A", "B"], ["B", "A"])).toEqual(["Brood", "B", "A"]);
  });

  it("nieuwe categorieën die nog nergens stonden komen mee in de volgorde", () => {
    expect(mergeCategoryOrder(["A", "B"], ["C", "B", "A"])).toEqual(["C", "B", "A"]);
  });
});
