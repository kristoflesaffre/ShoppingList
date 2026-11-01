import { describe, expect, it } from "vitest";
import { findFreezerItemForPlan, parseThawMarker, planFreezerDeductions, planThawTaskActions, thawDueDate, thawTaskDescription } from "./freezer-planning";

const dish = (over = {}) => ({ id: "i1", name: "Lasagne (diepvries)", fromStock: true, freezerItemId: "f1", itemDate: "2026-11-05", ...over });

describe("planFreezerDeductions", () => {
  it("boekt pas af als de dag voorbij is", () => {
    expect(planFreezerDeductions([dish({ itemDate: "2026-11-05" })], [{ id: "f1", packages: 2 }], "2026-11-05").deductedItemIds).toEqual([]);
    expect(planFreezerDeductions([dish({ itemDate: "2026-11-05" })], [{ id: "f1", packages: 2 }], "2026-11-06")).toEqual({ deductedItemIds: ["i1"], updates: [{ id: "f1", packages: 1 }], deleteIds: [] });
  });
  it("boekt nooit twee keer af", () => {
    expect(planFreezerDeductions([dish({ itemDate: "2026-11-01", stockDeductedAt: 1 })], [{ id: "f1", packages: 2 }], "2026-11-06").deductedItemIds).toEqual([]);
  });
  it("laat oude items zonder koppeling en de voorraadkast met rust", () => {
    const items = [dish({ itemDate: "2026-11-01", freezerItemId: undefined }), dish({ id: "i2", itemDate: "2026-11-01", stockSource: "pantry" })];
    expect(planFreezerDeductions(items, [{ id: "f1", packages: 2 }], "2026-11-06").deductedItemIds).toEqual([]);
  });
  it("telt meerdere gerechten op en verwijdert bij nul", () => {
    const items = [dish({ itemDate: "2026-11-01" }), dish({ id: "i2", itemDate: "2026-11-02" })];
    expect(planFreezerDeductions(items, [{ id: "f1", packages: 2 }], "2026-11-06")).toEqual({ deductedItemIds: ["i1", "i2"], updates: [], deleteIds: ["f1"] });
  });
  it("slaat een verdwenen diepvriesitem over", () => {
    expect(planFreezerDeductions([dish({ itemDate: "2026-11-01" })], [], "2026-11-06").deductedItemIds).toEqual([]);
  });
});

describe("thawDueDate", () => {
  it("is de dag ervoor, ook over een maandgrens", () => {
    expect(thawDueDate("2026-12-01", "2026-11-01")).toBe("2026-11-30");
  });
  it("is vandaag als de dag ervoor al voorbij is", () => {
    expect(thawDueDate("2026-11-01", "2026-11-01")).toBe("2026-11-01");
  });
});

describe("planThawTaskActions", () => {
  const today = "2026-11-01";
  const task = (itemId: string, itemDate: string, id = "t1") => ({ id, description: thawTaskDescription(itemId, itemDate) });

  it("maakt een taak met de dag ervoor als datum", () => {
    expect(planThawTaskActions([dish()], [], today)).toEqual([
      { kind: "create", itemId: "i1", content: "Uit de diepvries halen: Lasagne", description: thawTaskDescription("i1", "2026-11-05"), dueDate: "2026-11-04" },
    ]);
  });
  it("maakt een afgevinkte taak niet opnieuw aan", () => {
    expect(planThawTaskActions([dish({ thawTaskId: "t1" })], [], today)).toEqual([]);
  });
  it("verplaatst de taak als het gerecht verschuift", () => {
    const actions = planThawTaskActions([dish({ thawTaskId: "t1", itemDate: "2026-11-07" })], [task("i1", "2026-11-05")], today);
    expect(actions).toEqual([expect.objectContaining({ kind: "update", taskId: "t1", dueDate: "2026-11-06" })]);
  });
  it("laat een taak met dezelfde dag staan, ook als je ze zelf verzette", () => {
    expect(planThawTaskActions([dish({ thawTaskId: "t1" })], [task("i1", "2026-11-05")], today)).toEqual([]);
  });
  it("koppelt een bestaande taak in plaats van een dubbele te maken", () => {
    expect(planThawTaskActions([dish()], [task("i1", "2026-11-05")], today)).toEqual([{ kind: "link", itemId: "i1", taskId: "t1" }]);
  });
  it("sluit de taak als het gerecht weg of de dag voorbij is", () => {
    expect(planThawTaskActions([], [task("i1", "2026-11-05")], today)).toEqual([{ kind: "close", taskId: "t1" }]);
    expect(planThawTaskActions([dish({ thawTaskId: "t1", itemDate: "2026-10-30" })], [task("i1", "2026-10-30")], today)).toEqual([{ kind: "close", taskId: "t1" }]);
  });
  it("negeert gewone Todoist-taken", () => {
    expect(planThawTaskActions([], [{ id: "x", description: "Bel de dokter" }], today)).toEqual([]);
    expect(parseThawMarker(null)).toBeNull();
  });
});

describe("findFreezerItemForPlan", () => {
  const stock = [{ id: "a", name: "Soep" }, { id: "b", name: "Lasagne", recipeId: "r1" }];
  it("zoekt op recept en anders op naam", () => {
    expect(findFreezerItemForPlan(stock, { name: "Andere naam", recipeId: "r1" })?.id).toBe("b");
    expect(findFreezerItemForPlan(stock, { name: " soep " })?.id).toBe("a");
    expect(findFreezerItemForPlan(stock, { name: "Pizza" })).toBeUndefined();
  });
});
