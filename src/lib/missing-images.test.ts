import { describe, expect, it } from "vitest";
import {
  collectMissingImageReports,
  missingImageReportIdFromKey,
  missingImageReportKey,
} from "@/lib/missing-images";

describe("missing-images", () => {
  it("rapporteert lijst-items zonder productfoto en negeert matches", () => {
    const reports = collectMissingImageReports({
      nowIso: "2026-04-30T08:00:00.000Z",
      itemSlugs: ["melk"],
      ingredientSlugs: [],
      ingredientSynonyms: {},
      recipes: [],
      lists: [
        {
          id: "list-1",
          name: "Weeklijst",
          ownerId: "user-1",
          items: [
            { id: "item-1", name: "Melk" },
            { id: "item-2", name: "Onbekend product" },
          ],
        },
      ],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      sourceType: "list-item",
      sourceId: "item-2",
      itemName: "Onbekend product",
      normalizedName: "onbekend_product",
      imageKind: "product",
      sourcePath: "/lijstje/list-1",
      active: true,
    });
  });

  it("rapporteert receptfoto's en recept-ingredienten zonder afbeelding", () => {
    const reports = collectMissingImageReports({
      nowIso: "2026-04-30T08:00:00.000Z",
      itemSlugs: [],
      ingredientSlugs: ["bloem"],
      ingredientSynonyms: {},
      lists: [],
      recipes: [
        {
          id: "recipe-1",
          name: "Pannenkoeken",
          ownerId: "user-1",
          photoUrl: "",
          ingredients: [
            { id: "ing-1", name: "Bloem", quantity: "200 g" },
            { id: "ing-2", name: "Onbekend kruid", quantity: "1 tl" },
          ],
        },
      ],
    });

    expect(reports.map((report) => report.sourceType).sort()).toEqual([
      "recipe-ingredient",
      "recipe-photo",
    ]);
    expect(reports.find((report) => report.sourceType === "recipe-photo")).toMatchObject({
      itemName: "Pannenkoeken",
      imageKind: "recipe",
      sourcePath: "/recepten/recipe-1",
    });
  });

  it("maakt stabiele keys en ids voor idempotente upserts", () => {
    const key = missingImageReportKey({
      sourceType: "recipe-ingredient",
      sourceId: "ing-1",
      imageKind: "ingredient",
      normalizedName: "onbekend_kruid",
    });

    expect(key).toBe("recipe-ingredient:ing-1:ingredient:onbekend_kruid");
    const id = missingImageReportIdFromKey(key);
    expect(id).toBe(missingImageReportIdFromKey(key));
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
