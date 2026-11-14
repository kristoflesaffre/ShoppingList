import { describe, expect, it } from "vitest";
import { orderChanges } from "./vaste-lijstjes";

describe("orderChanges", () => {
  const items = [
    { id: "a", order: 0 },
    { id: "b", order: 1 },
    { id: "c", order: 2 },
    { id: "d", order: 7 },
  ];
  it("bewaart enkel wat verschuift", () => {
    expect(orderChanges(items, ["a", "c", "b"])).toEqual([
      { id: "c", order: 1 },
      { id: "b", order: 2 },
    ]);
  });
  it("hernummert een rij met gaten of dubbele nummers", () => {
    expect(orderChanges(items, ["a", "b", "d"])).toEqual([{ id: "d", order: 2 }]);
    expect(orderChanges([{ id: "a", order: 3 }, { id: "b", order: 3 }], ["b", "a"])).toEqual([
      { id: "b", order: 0 },
      { id: "a", order: 1 },
    ]);
  });
  it("laat onbekende ids en een ongewijzigde volgorde met rust", () => {
    expect(orderChanges(items, ["a", "b", "c"])).toEqual([]);
    expect(orderChanges(items, ["x", "a"])).toEqual([{ id: "a", order: 1 }]);
  });
});
