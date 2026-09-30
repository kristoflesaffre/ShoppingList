import { describe, expect, it } from "vitest";
import { resolveItemCategoryFromName } from "@/lib/item-ingredient-category";

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
});
