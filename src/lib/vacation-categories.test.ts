import { describe, expect, it } from "vitest";
import {
  resolveVacationCategoryFromName,
  resolveVacationItemCategoryFromSection,
} from "@/lib/vacation-categories";

describe("resolveVacationCategoryFromName", () => {
  it("mapt Excel-labels naar app-categorieën", () => {
    expect(resolveVacationCategoryFromName("Thee")).toBe("Eten & drinken");
    expect(resolveVacationCategoryFromName("Shampoo")).toBe("Toiletartikelen");
    expect(resolveVacationCategoryFromName("MacBook")).toBe("Elektronica");
    expect(resolveVacationCategoryFromName("Handdoeken")).toBe("Slaapspullen");
    expect(resolveVacationCategoryFromName("Jas (man)")).toBe("Kleding");
    expect(resolveVacationCategoryFromName("Juwelen")).toBe("Andere");
  });

  it("houdt voorbereidingsitems in Te regelen", () => {
    expect(resolveVacationCategoryFromName("Puddy verzorgen")).toBe("Te regelen");
    expect(resolveVacationCategoryFromName("Kat verzorgen")).toBe("Te regelen");
    expect(resolveVacationCategoryFromName("EV-route plannen")).toBe("Te regelen");
  });
});

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
