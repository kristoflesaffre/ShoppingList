import { describe, expect, it } from "vitest";
import { findFreezerItemForPlan, isThawDay, parseThawMarker, planFreezerDeductions, planFreezerLinks, planThawTaskActions, thawDueDate, thawedItemIds, thawPhotoUrl, thawTaskDescription } from "./freezer-planning";

const dish = (over = {}) => ({ id: "i1", name: "Lasagne (diepvries)", fromStock: true, freezerItemId: "f1", itemDate: "2026-11-05", ...over });

describe("isThawDay", () => {
  it("geldt enkel op de dag van het gerecht zelf", () => {
    const description = thawTaskDescription("i1", "2026-11-05");
    expect(isThawDay(description, "2026-11-04")).toBe(false);
    expect(isThawDay(description, "2026-11-05")).toBe(true);
    expect(isThawDay(description, "2026-11-06")).toBe(false);
    expect(isThawDay("Gewone taak", "2026-11-05")).toBe(false);
  });
});

describe("thawPhotoUrl", () => {
  const description = thawTaskDescription("i1", "2026-11-05");
  it("neemt de foto van het geplande gerecht", () => {
    expect(thawPhotoUrl(description, [dish({ stockPhotoUrl: "a.webp" })], [{ id: "f1", recipePhotoUrl: "b.webp" }])).toBe("a.webp");
  });
  it("valt terug op de foto van het diepvriesitem", () => {
    expect(thawPhotoUrl(description, [dish()], [{ id: "f1", recipePhotoUrl: "b.webp" }])).toBe("b.webp");
  });
  it("geeft niets zonder foto, gerecht of markering", () => {
    expect(thawPhotoUrl(description, [dish()], [{ id: "f1" }])).toBeNull();
    expect(thawPhotoUrl(description, [], [{ id: "f1", recipePhotoUrl: "b.webp" }])).toBeNull();
    expect(thawPhotoUrl("Gewone taak", [dish({ stockPhotoUrl: "a.webp" })], [])).toBeNull();
  });
});

describe("planFreezerDeductions", () => {
  it("boekt meteen af als de ontdooitaak afgevinkt is, ook voor de dag", () => {
    const thawed = new Set(["i1"]);
    expect(planFreezerDeductions([dish({ itemDate: "2026-11-05" })], [{ id: "f1", packages: 2 }], "2026-11-04", thawed)).toEqual({ deductedItemIds: ["i1"], updates: [{ id: "f1", packages: 1 }], deleteIds: [] });
    expect(planFreezerDeductions([dish({ itemDate: "2026-11-05", stockDeductedAt: 1 })], [{ id: "f1", packages: 2 }], "2026-11-04", thawed).deductedItemIds).toEqual([]);
  });
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
  it("maakt ook een taak voor een gerecht zonder koppeling met de voorraad", () => {
    const actions = planThawTaskActions([dish({ freezerItemId: undefined, itemDate: "2026-11-04" })], [], "2026-11-04");
    expect(actions).toMatchObject([{ kind: "create", itemId: "i1", dueDate: "2026-11-04" }]);
  });
  it("maakt geen taak voor de voorraadkast, zonder dag of als de portie al afgeboekt is", () => {
    expect(planThawTaskActions([dish({ stockSource: "pantry" })], [], "2026-11-04")).toEqual([]);
    expect(planThawTaskActions([dish({ itemDate: null })], [], "2026-11-04")).toEqual([]);
    expect(planThawTaskActions([dish({ stockDeductedAt: 1 })], [], "2026-11-04")).toEqual([]);
  });
  it("sluit een dubbele taak en houdt de gekoppelde", () => {
    const description = thawTaskDescription("i1", "2026-11-05");
    const tasks = [{ id: "t1", description }, { id: "t2", description }];
    expect(planThawTaskActions([dish({ thawTaskId: "t2" })], tasks, "2026-11-04")).toEqual([{ kind: "close", taskId: "t1" }]);
    expect(planThawTaskActions([dish({ thawTaskId: "t1" })], tasks, "2026-11-04")).toEqual([{ kind: "close", taskId: "t2" }]);
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

describe("planFreezerLinks", () => {
  const today = "2026-11-02";
  const stock = [{ id: "f1", name: "Rucolasoep" }, { id: "f2", name: "Lasagne" }];
  const open = (over = {}) => ({ id: "i1", name: "Rucolasoep", fromStock: true, itemDate: "2026-11-03", ...over });

  it("koppelt een gepland gerecht zonder koppeling op naam", () => {
    expect(planFreezerLinks([open()], stock, today)).toEqual([{ itemId: "i1", freezerItemId: "f1" }]);
  });
  it("negeert hoofdletters en het achtervoegsel (diepvries)", () => {
    expect(planFreezerLinks([open({ name: "lasagne (diepvries)" })], stock, today)).toEqual([{ itemId: "i1", freezerItemId: "f2" }]);
  });
  it("koppelt ook een gerecht van vandaag", () => {
    expect(planFreezerLinks([open({ itemDate: today })], stock, today)).toHaveLength(1);
  });
  it("laat voorbije gerechten met rust, zodat er niets met terugwerkende kracht afgaat", () => {
    expect(planFreezerLinks([open({ itemDate: "2026-11-01" })], stock, today)).toEqual([]);
  });
  it("slaat over: al gekoppeld, afgeboekt, voorraadkast, geen dag, geen voorraad, geen diepvriesitem", () => {
    const items = [
      open({ freezerItemId: "f1" }),
      open({ stockDeductedAt: 1 }),
      open({ stockSource: "pantry" }),
      open({ itemDate: undefined }),
      open({ fromStock: false }),
      open({ name: "Onbekend gerecht" }),
    ];
    expect(planFreezerLinks(items, stock, today)).toEqual([]);
  });
  it("een gekoppeld gerecht krijgt daarna een taak en wordt pas na de dag afgeboekt", () => {
    const [link] = planFreezerLinks([open()], stock, today);
    const linked = open({ freezerItemId: link.freezerItemId });
    expect(planThawTaskActions([linked], [], today)[0]).toMatchObject({ kind: "create", dueDate: today });
    expect(planFreezerDeductions([linked], [{ id: "f1", packages: 1 }], today).deductedItemIds).toEqual([]);
  });
});

describe("thawedItemIds", () => {
  const planned = dish({ thawTaskId: "t1" });
  it("vindt gerechten van vandaag of later waarvan de taak niet meer open staat", () => {
    expect(thawedItemIds([planned], [], "2026-11-05")).toEqual(["i1"]);
    expect(thawedItemIds([planned], [], "2026-11-04")).toEqual(["i1"]);
  });
  it("niet zolang de taak nog open staat, op id of op markering", () => {
    expect(thawedItemIds([planned], [{ id: "t1" }], "2026-11-04")).toEqual([]);
    expect(thawedItemIds([planned], [{ id: "t9", description: thawTaskDescription("i1", "2026-11-05") }], "2026-11-04")).toEqual([]);
  });
  it("laat gerechten zonder taak, al afgeboekte en voorbije met rust", () => {
    expect(thawedItemIds([dish()], [], "2026-11-04")).toEqual([]);
    expect(thawedItemIds([dish({ thawTaskId: "t1", stockDeductedAt: 1 })], [], "2026-11-04")).toEqual([]);
    expect(thawedItemIds([planned], [], "2026-11-06")).toEqual([]);
  });
});
