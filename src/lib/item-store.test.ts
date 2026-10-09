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
