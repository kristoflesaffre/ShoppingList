import { describe, expect, it } from "vitest";
import { resolveVacationItemCategoryFromSection } from "@/lib/vacation-categories";

describe("resolveVacationItemCategoryFromSection", () => {
  it("gebruikt de weergavetitel bij gegroepeerde secties", () => {
    expect(
      resolveVacationItemCategoryFromSection(
        "Eten & drinken|unchecked",
        "Eten & drinken",
      ),
    ).toBe("Eten & drinken");
  });

  it("valt terug op Andere bij onbekende titel", () => {
    expect(resolveVacationItemCategoryFromSection("Onbekend")).toBe("Andere");
  });
});
