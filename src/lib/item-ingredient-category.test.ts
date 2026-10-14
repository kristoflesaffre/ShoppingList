import { describe, expect, it } from "vitest";
import {
  effectiveItemCategory,
  resolveItemCategoryFromName,
} from "@/lib/item-ingredient-category";

describe("resolveItemCategoryFromName", () => {
  it.each(["Ananas", "perziken", "Perzik"])(
    "deelt %s in bij groenten en fruit",
    (name) => {
      expect(resolveItemCategoryFromName(name)).toBe("Groenten & Fruit");
    },
  );

  it.each(["Red bull pink edition", "Red bull white edition"])(
    "deelt %s in bij koude dranken",
    (name) => {
      expect(resolveItemCategoryFromName(name)).toBe("Koude Dranken");
    },
  );

  it.each(["Kippenvinken", "Witte pensen"])(
    "deelt %s in bij vlees en charcuterie",
    (name) => {
      expect(resolveItemCategoryFromName(name)).toBe("Vlees & Charcuterie");
    },
  );

  it("deelt Zespri gold kiwi in bij groenten en fruit", () => {
    expect(resolveItemCategoryFromName("Zespri gold kiwi")).toBe(
      "Groenten & Fruit",
    );
  });

  it("deelt kippengehakt in bij vlees en charcuterie", () => {
    expect(resolveItemCategoryFromName("Kippengehakt")).toBe(
      "Vlees & Charcuterie",
    );
  });

  it("deelt krabsla in bij vlees en charcuterie", () => {
    expect(resolveItemCategoryFromName("Krabsla")).toBe(
      "Vlees & Charcuterie",
    );
  });

  it("deelt frituur in als afhaalgerecht", () => {
    expect(resolveItemCategoryFromName("Frituur")).toBe("Afhaalgerechten");
  });

  it("overschrijft voor frituur een oude opgeslagen itemcategorie", () => {
    expect(
      effectiveItemCategory({ name: "Frituur", itemCategory: "Overig" }),
    ).toBe("Afhaalgerechten");
  });
});
