import { describe, expect, it } from "vitest";
import { itemMatchesStoreFilter, parseItemStore, parseStoreFilter } from "./item-store";

describe("item-store", () => {
  it("parses only known stores", () => {
    expect(parseItemStore("lidl")).toBe("lidl");
    expect(parseItemStore("both")).toBe("both");
    expect(parseItemStore("aldi")).toBeUndefined();
    expect(parseItemStore(undefined)).toBeUndefined();
    expect(parseStoreFilter("delhaize")).toBe("delhaize");
    expect(parseStoreFilter("both")).toBe("all");
  });

  it("keeps items without a choice and «both» items in every filter", () => {
    expect(itemMatchesStoreFilter(undefined, "lidl")).toBe(true);
    expect(itemMatchesStoreFilter("both", "delhaize")).toBe(true);
    expect(itemMatchesStoreFilter("lidl", "lidl")).toBe(true);
    expect(itemMatchesStoreFilter("lidl", "delhaize")).toBe(false);
    expect(itemMatchesStoreFilter("delhaize", "all")).toBe(true);
  });
});

import { parseIngredientStores, serializeIngredientStores } from "./item-store";

describe("ingredient stores", () => {
  it("round-trips and normalises names", () => {
    const map = parseIngredientStores(JSON.stringify({ " Hamburgers": "lidl", Melk: "both", Fout: "aldi" }));
    expect(map.get("hamburgers")).toBe("lidl");
    expect(map.get("melk")).toBe("both");
    expect(map.has("fout")).toBe(false);
    expect(parseIngredientStores(serializeIngredientStores(map))).toEqual(map);
    expect(parseIngredientStores("{kapot").size).toBe(0);
  });
});
