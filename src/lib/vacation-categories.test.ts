import { describe, expect, it } from "vitest";
import {
  resolveVacationCategoryFromName,
  resolveVacationItemCategoryFromSection,
} from "@/lib/vacation-categories";
import { resolveVacationTripPersonFromDefaultItems } from "@/lib/vacation-default-items";

describe("resolveVacationCategoryFromName", () => {
  it("mapt Excel-labels naar app-categorieën", () => {
    expect(resolveVacationCategoryFromName("Thee")).toBe("Eten & drinken");
    expect(resolveVacationCategoryFromName("Shampoo")).toBe("Toiletartikelen");
    expect(resolveVacationCategoryFromName("MacBook")).toBe("Elektronica");
    expect(resolveVacationCategoryFromName("Handdoeken")).toBe("Toiletartikelen");
    expect(resolveVacationCategoryFromName("Ehbo-kit")).toBe("Toiletartikelen");
    expect(resolveVacationCategoryFromName("Pincet")).toBe("Toiletartikelen");
    expect(resolveVacationCategoryFromName("Pluchen knuffel")).toBe("Slaapspullen");
    expect(resolveVacationCategoryFromName("Jas (man)")).toBe("Kleding");
    expect(resolveVacationCategoryFromName("Juwelen")).toBe("Accessoires");
    expect(resolveVacationCategoryFromName("Bril")).toBe("Accessoires");
    expect(resolveVacationCategoryFromName("Zonnebril")).toBe("Accessoires");
    expect(resolveVacationCategoryFromName("Haarelastiekjes")).toBe("Accessoires");
    expect(resolveVacationCategoryFromName("Haarspelden")).toBe("Accessoires");
    expect(resolveVacationCategoryFromName("Pet")).toBe("Accessoires");
    expect(resolveVacationCategoryFromName("Zonnehoed")).toBe("Accessoires");
    expect(resolveVacationCategoryFromName("Immodium")).toBe("Medicijnen");
    expect(resolveVacationCategoryFromName("Imodium")).toBe("Medicijnen");
    expect(resolveVacationCategoryFromName("Motilium")).toBe("Medicijnen");
    expect(resolveVacationCategoryFromName("Vaatdoek")).toBe("Huishouden");
    expect(resolveVacationCategoryFromName("Strandtas")).toBe("Strand");
  });

  it("houdt voorbereidingsitems in Te regelen", () => {
    expect(resolveVacationCategoryFromName("Puddy verzorgen")).toBe("Te regelen");
    expect(resolveVacationCategoryFromName("Kat verzorgen")).toBe("Te regelen");
    expect(resolveVacationCategoryFromName("EV-route plannen")).toBe("Te regelen");
  });
});

describe("resolveVacationTripPersonFromDefaultItems", () => {
  it("kent gezinsbrede standaarditems toe aan Samen", () => {
    expect(resolveVacationTripPersonFromDefaultItems("Aftersun")).toBe("Samen");
    expect(resolveVacationTripPersonFromDefaultItems("Strandlaken")).toBe("Samen");
  });

  it("kent persoonlijke standaarditems toe aan de juiste tab", () => {
    expect(resolveVacationTripPersonFromDefaultItems("Zwemshort")).toBe("Kristof");
    expect(resolveVacationTripPersonFromDefaultItems("Make-up")).toBe("Chloé");
    expect(resolveVacationTripPersonFromDefaultItems("Pluchen knuffel")).toBe(
      "Noë",
    );
  });

  it("mapt Excel-doelgroep Algemeen niet automatisch naar Samen", () => {
    expect(resolveVacationTripPersonFromDefaultItems("Shampoo")).toBe("Chloé");
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
